import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, ForbiddenResult, NotFoundResult } from "../../common/objects/custom-errors";
import { GenericResponse } from "../common/genericResponse";
import { Utility } from "../common/Utility";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
import { DataTransform } from "../utilities/dataTransform";
import { JsonParser } from "../utilities/jsonParser";
import { SharingRulesHelper } from "../utilities/sharingRulesHelper";
import { RequestValidator } from "../validators/requestValidator";

export class BasePut {
  /**
   * For all clinical resource patientElement hold the profile reference to who the record belongs,
   * informationSourceElement holds the profile reference to the someone who is creating the patient data,
   * requesterId points to the logged in user.
   * For use with FHIR resources we would set the informationSourceElement same as patientElement
   * TODO: should we disallow nulls for patientElement and informationSourceElement
   * @param requestPayload
   * @param {string} requesterProfileId
   * @param {T} payloadModel
   * @param payloadDataResourceModel
   * @param {string} patientElement
   * @param {string} informationSourceElement
   * @param referenceValidationModel
   * @param {string} referenceValidationElement
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async updateClinicalResources<T>(
    requestPayload,
    requesterProfileId: string,
    payloadModel: T,
    payloadDataResourceModel,
    patientElement: string,
    informationSourceElement: string,
    referenceValidationModel?,
    referenceValidationElement?: string
  ): Promise<GenericResponse<T>> {
    log.info("Inside updateClinicalResources ");
    // validate request payload
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    const total = requestPayload.length;
    log.info("Record Array created successfully ");
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientElement, []);
    keysToFetch.set(Constants.ID, []);
    // validate informationSourceElement only if it is present and different from patient element
    const isValidInformationSourceElement: boolean = informationSourceElement && informationSourceElement !== patientElement;
    if (isValidInformationSourceElement) {
      keysToFetch.set(informationSourceElement, []);
    }
    // add referenceValidationElement in map only if element it is present
    const isValidReferenceElement: boolean = referenceValidationModel && referenceValidationElement ? true : false;
    if (isValidReferenceElement) {
      keysToFetch.set(referenceValidationElement, []);
    }
    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Device and User Keys retrieved successfully :: saveResource()");

    // perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.debug("Device validation is successful");

    // perform user validation for patient reference
    const patientReferences = [...new Set(keysMap.get(patientElement))];
    RequestValidator.validateSingularUserReference(patientReferences);
    const patientReferenceValue = patientReferences[0];
    log.debug("PatientElement [" + patientElement + "] validation is successful");

    // perform user validation for informationSource
    let informationSourceReferenceValue = patientReferenceValue; // handling for FHIR services
    if (isValidInformationSourceElement) {
      const informationSourceIds = [...new Set(keysMap.get(informationSourceElement))];
      RequestValidator.validateSingularUserReference(informationSourceIds);
      informationSourceReferenceValue = informationSourceIds[0];
      log.debug("InformationSourceElement [" + informationSourceElement + "] validation is successful");
    }
    log.info("Device and user validation is successful");

    // fetch primaryKey of each record from request payload and validate
    const primaryKeyIds = [...new Set(keysMap.get(Constants.ID))];
    RequestValidator.validateLength(primaryKeyIds, total);
    log.info("Primary keys are validated");

    // Sharing rules validation here
    const connection = await AuthService.authorizeRequest(requesterProfileId, informationSourceReferenceValue, patientReferenceValue, Constants.PATIENT_USER);
    log.info("User Authorization is successful ");
    const queryObject = { id: primaryKeyIds };
    let whereClause = {};
    // For system user/ loggedin user to get his own record we won't add sharing rules
    if (connection.length > 0) {
      // If logged in user trying to updated others records then validate with filtered primaryKeyIds based on sharing rules
      whereClause = SharingRulesHelper.addSharingRuleClause(queryObject, connection[0], payloadModel, Constants.ACCESS_EDIT);
      if (_.isEmpty(whereClause[Op.and])) {
        log.info("Sharing rules not present for requested user");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    } else {
      // If logged in user type is system/patient then validate with primaryKeyIds
      whereClause = queryObject;
    }

    const options = { where: whereClause, attributes: [Constants.ID] };
    // Get validIds after sharing rules
    let filteredPrimaryKeyIds: any = await DAOService.search(payloadModel, options);
    filteredPrimaryKeyIds = _.map(filteredPrimaryKeyIds, Constants.ID);
    // fetch unique reference ids of referenceValidationElement which needs to be validated
    let uniquesReferenceIds;
    if (isValidReferenceElement) {
      uniquesReferenceIds = [...new Set(keysMap.get(referenceValidationElement))].filter(Boolean);
      uniquesReferenceIds = uniquesReferenceIds.map((referenceId) => {
        return referenceId.split("/")[1];
      });
      log.debug("referenceIds length : " + uniquesReferenceIds.length);
    }
    const result = await BasePut.bulkUpdate(
      requestPayload,
      requesterProfileId,
      filteredPrimaryKeyIds,
      payloadModel,
      payloadDataResourceModel,
      referenceValidationModel,
      referenceValidationElement,
      uniquesReferenceIds
    );
    log.info("Payload updated successfully ");
    return result;
  }

  /**
   *  Returns back array of saved or error out record after validating all records on basis of ID and version keys
   *  Also does the required update operation via Promise all after creating updateMetadata
   * @static
   * @param {*} requestPayload request payload
   * @param {string} requesterProfileId
   * @param {string[]} requestPrimaryIds
   * @param {*} model
   * @param {*} modelDataResource
   * @param referenceValidationModel
   * @param {string} referenceValidationAttribute
   * @returns
   * @memberof BasePut
   */
  public static async bulkUpdate(
    requestPayload,
    requesterProfileId: string,
    requestPrimaryIds: string[],
    model,
    modelDataResource,
    referenceValidationModel?,
    referenceValidationAttribute?: string,
    uniquesReferenceIds?
  ) {
    log.info("Inside bulkUpdate() ");
    // check if referenceAttribute validation is required
    const isValidateReferences: boolean = referenceValidationModel && referenceValidationAttribute && uniquesReferenceIds;
    let validReferenceIds;
    // validate uniqueReferenceIds against referenceValidationModel
    if (isValidateReferences) {
      // check if uniqueReferenceIds exists in DB
      validReferenceIds = await DataFetch.getValidIds(referenceValidationModel, uniquesReferenceIds);
      validReferenceIds = Utility.findIds(validReferenceIds, Constants.ID).map((eachId) => eachId);
    }
    // validate primaryKeys of all the records in request payload
    const validPrimaryIds = await DataFetch.getValidIds(model, requestPrimaryIds);
    log.info("Valid primary Ids fetched successfully :: saveRecord()");
    const result = { savedRecords: [], errorRecords: [] };
    // creating an all promise array which can be executed in parallel.
    const allPromise = [];
    // looping over all records to filter good vs bad records
    requestPayload.forEach((record) => {
      // Finding if given record id exists in the record ID list received via DB batch get call.
      const existingRecord = validPrimaryIds.find((validPrimaryId) => {
        return validPrimaryId.id === record.id;
      });
      if (existingRecord) {
        // If record of given id exists in database then we come in this condition.
        if (existingRecord.meta.versionId === record.meta.versionId) {
          // We proceed with creation of metadata and adding record to be saved if its version ID is correct
          record.meta = DataTransform.getUpdateMetaData(record, existingRecord.meta, requesterProfileId, false);
          record = DataTransform.convertToModel(record, model, modelDataResource).dataValues;
          // if isValidateReferences = true then only referenceValidationAttribute values are validated
          if (
            isValidateReferences &&
            record.dataResource.hasOwnProperty(referenceValidationAttribute.split(Constants.DOT_VALUE)[0]) &&
            !validReferenceIds.includes(
              record.dataResource[referenceValidationAttribute.split(Constants.DOT_VALUE)[0]].reference.split(Constants.FORWARD_SLASH)[1]
            )
          ) {
            const badRequest = new BadRequestResult(
              errorCodeMap.InvalidReference.value,
              errorCodeMap.InvalidReference.description + referenceValidationAttribute.split(Constants.DOT_VALUE)[0]
            );
            badRequest.clientRequestId = record.meta.clientRequestId;
            result.errorRecords.push(badRequest);
          } else {
            const resultPromise = DAOService.update(model, record).then((updatedRecord) => {
              result.savedRecords.push(updatedRecord);
            });
            allPromise.push(resultPromise);
          }
        } else {
          // Else condition if version id is incorrect
          const badRequest = new BadRequestResult(errorCodeMap.InvalidResourceVersion.value, existingRecord.meta.versionId);
          badRequest.clientRequestId = record.meta.clientRequestId;
          result.errorRecords.push(badRequest);
        }
      } else {
        // Else condition if record sent to update doesn't exists in database
        const notFoundResult = new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
        notFoundResult.clientRequestId = record.meta.clientRequestId;
        result.errorRecords.push(notFoundResult);
      }
    });
    // promise all to run in parallel.
    log.info("Firing bulk update all promises :: bulkUpdate()");
    await Promise.all(allPromise);
    return result;
  }

  /**
   * FIXME: Review this for non-clinical usage. Currently no integrations
   * @param requestPayload
   * @param {string} requesterProfileId
   * @param {T} payloadModel
   * @param payloadDataResourceModel
   * @param {string} ownerElement
   * @param referenceValidationModel
   * @param {string} referenceValidationElement
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async updateNonClinicalResources<T>(
    requestPayload,
    requesterProfileId: string,
    payloadModel: T,
    payloadDataResourceModel,
    ownerElement: string,
    informationSourceElement: string,
    referenceValidationModel?,
    referenceValidationElement?: string
  ): Promise<GenericResponse<T>> {
    log.info("inside updateNonClinicalResources() ");
    // validate request payload
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    const total = requestPayload.length;
    log.info("Record Array created successfully ");

    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(Constants.ID, []);
    keysToFetch.set(ownerElement, []);
    keysToFetch.set(informationSourceElement, []);
    // add referenceValidationElement in map only if element it is present
    const validateReferenceElement: boolean = referenceValidationModel && referenceValidationElement ? true : false;
    if (validateReferenceElement) {
      keysToFetch.set(referenceValidationElement, []);
    }

    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("All the retrieved successfully ");
    //  perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.debug("Device validation is successful");
    // perform owner reference validation
    const ownerReferences = [...new Set(keysMap.get(ownerElement))];
    RequestValidator.validateSingularUserReference(ownerReferences);
    log.debug("OwnerElement [" + ownerElement + "] validation is successful");
    // perform infoSource reference validation
    const informationSourceReferences = [...new Set(keysMap.get(informationSourceElement))];
    RequestValidator.validateSingularUserReference(informationSourceReferences);
    log.debug("InformationSourceElement [" + informationSourceElement + "] validation is successful");
    // primary key Ids validation
    const primaryKeyIds = [...new Set(keysMap.get(Constants.ID))];
    RequestValidator.validateLength(primaryKeyIds, total);
    log.info("Primary keys are validated");
    // perform Authorization, not setting ownerType as we do not care if patient or any other.
    // Sharing rules validation here
    const connection = await AuthService.authorizeRequest(requesterProfileId, informationSourceReferences[0], ownerReferences[0]);
    log.info("User Authorization is successful ");
    const queryObject = { id: primaryKeyIds };
    let whereClause = {};
    // For system user/ loggedin user to get his own record we won't add sharing rules
    if (connection.length > 0) {
      // If logged in user trying to updated others records then validate with filtered primaryKeyIds based on sharing rules
      whereClause = SharingRulesHelper.addSharingRuleClause(queryObject, connection[0], payloadModel, Constants.ACCESS_EDIT);
      if (_.isEmpty(whereClause[Op.and])) {
        log.info("Sharing rules not present for requested user");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    } else {
      // If logged in user type is system/patient then validate with primaryKeyIds
      whereClause = queryObject;
    }

    const options = { where: whereClause, attributes: [Constants.ID] };
    // Get validIds after sharing rules
    let filteredPrimaryKeyIds: any = await DAOService.search(payloadModel, options);
    filteredPrimaryKeyIds = _.map(filteredPrimaryKeyIds, Constants.ID);
    // fetch unique reference ids of referenceValidationElement which needs to be validated
    let uniquesReferenceIds;
    if (validateReferenceElement) {
      uniquesReferenceIds = [...new Set(keysMap.get(referenceValidationElement))].filter(Boolean);
      uniquesReferenceIds = uniquesReferenceIds.map((referenceId) => {
        return referenceId.split("/")[1];
      });
      log.debug("referenceIds length : " + uniquesReferenceIds.length);
    }
    const result = await BasePut.bulkUpdate(
      requestPayload,
      requesterProfileId,
      filteredPrimaryKeyIds,
      payloadModel,
      payloadDataResourceModel,
      referenceValidationModel,
      referenceValidationElement,
      uniquesReferenceIds
    );
    log.info("Payload updated successfully ");
    return result;
  }
}
