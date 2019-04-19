import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";
import { DataHelperService } from "../common/dataHelperService";
import { Utility } from "../common/Utility";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
import { DataTransform } from "../utilities/dataTransform";
import { JsonParser } from "../utilities/jsonParser";
import { RequestValidator } from "../validators/requestValidator";

export class BasePut {
  /**
   *  Wrapper function to perform update for CPH users
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requestorProfileId requestorProfileId Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BasePut
   */
  public static async updateResource(requestPayload, patientElement: string, requestorProfileId: string, model, modelDataResource) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    let total;
    if (!Array.isArray(requestPayload.entry)) {
      requestPayload = [requestPayload];
      total = 1;
    } else {
      total = requestPayload.total;
      requestPayload = requestPayload.entry.map((entry) => entry.resource);
      RequestValidator.validateBundleTotal(requestPayload, total);
      RequestValidator.validateBundlePostLimit(requestPayload, Constants.POST_LIMIT);
    }
    log.info("Record Array created succesfully in :: updateResource()");
    const keysToFetch = new Map();
    keysToFetch.set("id", []);
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientElement, []);
    keysToFetch.set(Constants.INFORMATION_SOURCE_REFERENCE_KEY, []);
    const response = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: updateResource()");
    const uniqueDeviceIds = [...new Set(response.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    // patientvalidationid
    const patientIds = [...new Set(response.get(patientElement))];
    // userids
    const informationSourceIds = [...new Set(response.get(Constants.INFORMATION_SOURCE_REFERENCE_KEY))];
    // primary key Ids
    const primaryIds = [...new Set(response.get(Constants.ID))];
    // perform Authorization
    await RequestValidator.validateDeviceAndProfile(uniqueDeviceIds, informationSourceIds, patientIds);
    await RequestValidator.validateUniqueIDForPUT(primaryIds, total);
    // We can directly use 0th element as we have validated the uniqueness of reference key in validateDeviceAndProfile
    const patientReferenceValue = patientIds[0];
    const informationSourceReferenceValue = informationSourceIds[0];
    await AuthService.authorizeRequest(requestorProfileId, informationSourceReferenceValue, patientReferenceValue);
    log.info("User Authorization successfully :: updateResource()");
    const result = await BasePut.bulkUpdate(requestPayload, requestorProfileId, primaryIds, model, modelDataResource);
    log.info("Update successfull :: updateResource()");
    return result;
  }

  /**
   *  Wrapper function to perform update for CPH users
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requestorProfileId requestorProfileId Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BasePut
   */
  public static async updateResourcesWithReference(
    requestPayload,
    patientElement: string,
    requestorProfileId: string,
    model,
    modelDataResource,
    referenceValidationModel,
    referenceValidationAttribute: string
  ) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    let total;
    if (!Array.isArray(requestPayload.entry)) {
      requestPayload = [requestPayload];
      total = 1;
    } else {
      total = requestPayload.total;
      requestPayload = requestPayload.entry.map((entry) => entry.resource);
      RequestValidator.validateBundleTotal(requestPayload, total);
      RequestValidator.validateBundlePostLimit(requestPayload, Constants.POST_LIMIT);
    }
    log.info("Record Array created succesfully in :: updateResource()");
    const keysToFetch = new Map();
    keysToFetch.set("id", []);
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientElement, []);
    keysToFetch.set(Constants.INFORMATION_SOURCE_REFERENCE_KEY, []);
    keysToFetch.set(referenceValidationAttribute, []);
    const response = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: updateResource()");
    const uniqueDeviceIds = [...new Set(response.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    // patientvalidationid
    const patientIds = [...new Set(response.get(patientElement))];
    // userids
    const informationSourceIds = [...new Set(response.get(Constants.INFORMATION_SOURCE_REFERENCE_KEY))];
    // primary key Ids
    const primaryIds = [...new Set(response.get(Constants.ID))];
    // perform Authorization
    await RequestValidator.validateDeviceAndProfile(uniqueDeviceIds, informationSourceIds, patientIds);
    await RequestValidator.validateUniqueIDForPUT(primaryIds, total);
    // We can directly use 0th element as we have validated the uniqueness of reference key in validateDeviceAndProfile
    const patientReferenceValue = patientIds[0];
    const informationSourceReferenceValue = informationSourceIds[0];
    await AuthService.authorizeRequest(requestorProfileId, informationSourceReferenceValue, patientReferenceValue);
    log.info("User Authorization successfully :: updateResource()");
    let uniquesReferenceIds = [...new Set(response.get(referenceValidationAttribute))].filter(Boolean);
    uniquesReferenceIds = uniquesReferenceIds.map((referenceId) => {
      return referenceId.split("/")[1];
    });
    const result = await BasePut.bulkUpdateWithReference(
      requestPayload,
      requestorProfileId,
      primaryIds,
      model,
      modelDataResource,
      referenceValidationModel,
      referenceValidationAttribute,
      uniquesReferenceIds
    );
    log.info("Update successfull :: updateResource()");
    return result;
  }

  /**
   *  Returns back array of saved or error out record after validating all records on basis of ID and version keys
   *  Also does the required update operation via Promise all after creating updateMetadata
   * @static
   * @param {*} requestPayload request payload
   * @param {string} requestorProfileId
   * @param {string[]} requestPrimaryIds
   * @param {*} model
   * @param {*} modelDataResource
   * @param referenceValidationModel
   * @param {string} referenceValidationAttribute
   * @returns
   * @memberof BasePut
   */
  public static async bulkUpdateWithReference(
    requestPayload,
    requestorProfileId: string,
    requestPrimaryIds: string[],
    model,
    modelDataResource,
    referenceValidationModel,
    referenceValidationAttribute: string,
    uniquesReferenceIds
  ) {
    log.info("In bulkUpdate() :: BasePut Class");
    let validReferenceIds = await DataFetch.getValidIds(referenceValidationModel, uniquesReferenceIds);
    validReferenceIds = Utility.findIds(validReferenceIds, Constants.ID).map((eachId) => eachId);
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
          record.meta = DataTransform.getUpdateMetaData(record, existingRecord.meta, requestorProfileId, false);
          record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
          if (
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
            const thisPromise = model
              .update(record, { where: { id: record.id } })
              .then(() => {
                result.savedRecords.push(record.dataResource);
              })
              .catch((err) => {
                log.error("Error in updating record: " + err);
                throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
              });
            allPromise.push(thisPromise);
          }
        } else {
          // Else condition if version id is incorrect
          const badRequest = new BadRequestResult(errorCodeMap.InvalidResourceVersion.value, existingRecord.meta.versionId);
          badRequest.clientRequestId = record.meta.clientRequestId;
          result.errorRecords.push(badRequest);
        }
      } else {
        // Else condition if record sent to update doesnt exists in database
        const notFoundResult = new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
        notFoundResult.clientRequestId = record.meta.clientRequestId;
        result.errorRecords.push(notFoundResult);
      }
    });
    // promise all to run in parallel.
    log.info("Firing bulk update all promises :: bulkUpdate()");
    await Promise.all(allPromise);
    log.info("Bulk create successfull :: bulkUpdate()");
    return result;
  }

  /**
   *  Returns back array of saved or error out record after validating all records on basis of ID and version keys
   *  Also does the required update operation via Promise all after creating updateMetadata
   * @static
   * @param {*} requestPayload request payload
   * @param {string} requestorProfileId
   * @param {string[]} requestPrimaryIds
   * @param {*} model
   * @param {*} modelDataResource
   * @returns
   * @memberof BasePut
   */
  public static async bulkUpdate(requestPayload, requestorProfileId: string, requestPrimaryIds: string[], model, modelDataResource) {
    log.info("In bulkUpdate() :: BasePut Class");
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
          record.meta = DataTransform.getUpdateMetaData(record, existingRecord.meta, requestorProfileId, false);
          record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
          const thisPromise = model
            .update(record, { where: { id: record.id } })
            .then(() => {
              result.savedRecords.push(record.dataResource);
            })
            .catch((err) => {
              log.error("Error in updating record: " + err);
              throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
            });
          allPromise.push(thisPromise);
        } else {
          // Else condition if version id is incorrect
          const badRequest = new BadRequestResult(errorCodeMap.InvalidResourceVersion.value, existingRecord.meta.versionId);
          badRequest.clientRequestId = record.meta.clientRequestId;
          result.errorRecords.push(badRequest);
        }
      } else {
        // Else condition if record sent to update doesnt exists in database
        const notFoundResult = new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
        notFoundResult.clientRequestId = record.meta.clientRequestId;
        result.errorRecords.push(notFoundResult);
      }
    });
    // promise all to run in parallel.
    log.info("Firing bulk update all promises :: bulkUpdate()");
    await Promise.all(allPromise);
    log.info("Bulk create successfull :: bulkUpdate()");
    return result;
  }
}
