import * as log from "lambda-log";
import * as uuid from "uuid";
import { Constants } from "../../common/constants/constants";
import { DataHelperService } from "../common/dataHelperService";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { DataTransform } from "../utilities/dataTransform";
import { JsonParser } from "../utilities/jsonParser";
import { RequestValidator } from "../validators/requestValidator";

export class BasePost {
  /**
   *  Wrapper function to perform save for CPH users
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requestorProfileId requestorProfileId Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BasePost
   */
  public static async saveResource(requestPayload, patientElement: string, requestorProfileId: string, model, modelDataResource) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    log.info("Record Array created succesfully in :: saveResource()");
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientElement, []);
    keysToFetch.set(Constants.INFORMATION_SOURCE_REFERENCE_KEY, []);
    const response = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveResource()");
    const uniqueDeviceIds = [...new Set(response.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    // patientvalidationid
    const patientIds = [...new Set(response.get(patientElement))];
    // userids
    const informationSourceIds = [...new Set(response.get(Constants.INFORMATION_SOURCE_REFERENCE_KEY))];
    // perform Authorization
    await RequestValidator.validateDeviceAndProfile(uniqueDeviceIds, informationSourceIds, patientIds);
    // We can directly use 0th element as we have validated the uniqueness of reference key in validateDeviceAndProfile
    const patientReferenceValue = patientIds[0];
    const informationSourceReferenceValue = informationSourceIds[0];
    await AuthService.authorizeRequest(requestorProfileId, informationSourceReferenceValue, patientReferenceValue);
    log.info("User Authorization is successful ");
    log.info("Calling prepareModelAndSave method ");
    return await this.prepareModelAndSave(requestPayload, model, modelDataResource, requestorProfileId, requestorProfileId);
  }

  /**
   * Wrapper function to perform save for CPH users with Reference validation.
   * @param requestPayload
   * @param requestorProfileId
   * @return {Promise<any>}
   */
  public static async saveResourcesWithReference(
    requestPayload,
    patientElement: string,
    requestorProfileId: string,
    model,
    modelDataResource,
    referenceValidationModel,
    referenceValidationAttribute: string
  ) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    const result: any = { savedRecords: [], errorRecords: [] };
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    log.info("Record Array created succesfully in :: saveResource()");
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(Constants.SUBJECT_REFERENCE_KEY, []);
    keysToFetch.set(Constants.INFORMATION_SOURCE_REFERENCE_KEY, []);
    keysToFetch.set(referenceValidationAttribute, []);
    const response = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveResource()");
    const uniqueDeviceIds = [...new Set(response.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    // patientvalidationid
    const patientIds = [...new Set(response.get(Constants.SUBJECT_REFERENCE_KEY))];
    // userids
    const informationSourceIds = [...new Set(response.get(Constants.INFORMATION_SOURCE_REFERENCE_KEY))];
    // perform Authorization
    await RequestValidator.validateDeviceAndProfile(uniqueDeviceIds, informationSourceIds, patientIds);
    // We can directly use 0th element as we have validated the uniqueness of reference key in validateDeviceAndProfile
    const patientReferenceValue = patientIds[0];
    const informationSourceReferenceValue = informationSourceIds[0];
    await AuthService.authorizeRequest(requestorProfileId, informationSourceReferenceValue, patientReferenceValue);
    log.info("User Authorization is successful ");
    // uniquesReferenceIds
    let uniquesReferenceIds = [...new Set(response.get(referenceValidationAttribute))].filter(Boolean);
    uniquesReferenceIds = uniquesReferenceIds.map((referenceId) => {
      return referenceId.split("/")[1];
    });
    const filteredResources = await RequestValidator.filterValidReferences(
      requestPayload,
      uniquesReferenceIds,
      referenceValidationModel,
      referenceValidationAttribute
    );
    if (filteredResources.validResources.length > 0) {
      log.info("Calling prepareModelAndSave method ");
      const savedResources = await BasePost.prepareModelAndSave(
        filteredResources.validResources,
        model,
        modelDataResource,
        requestorProfileId,
        requestorProfileId
      );
      result.savedRecords = savedResources.savedRecords;
    }
    if (filteredResources.errorResults) {
      result.errorRecords = filteredResources.errorResults;
    }
    return result;
  }

  /**
   *  Wrapper function to perform save for FHIR services users
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requestorProfileId requestorProfileId Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BasePost
   */
  public static async saveFHIRResource(requestPayload, patientElement: string, requestorProfileId: string, model, modelDataResource) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    log.info("Record Array created succesfully in :: saveRecord()");
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientElement, []);
    const response = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveRecord()");
    const uniqueDeviceIds = [...new Set(response.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    // patientvalidationid
    const patientIds: any = [...new Set(response.get(patientElement))];
    // perform patient reference validation
    RequestValidator.validateUniquePatientReference(patientIds);
    //  perform deviceId validation
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    // We can directly use 0th element as we have validated the uniqueness of reference key in validateDeviceAndProfile
    const patientReferenceValue = patientIds[0];
    // FHIR services don't have informationSource validation so created new function for authorization
    // Patient will be information source
    await AuthService.authorizeRequest(requestorProfileId, patientReferenceValue, patientReferenceValue);
    log.info("User Authorization successfully :: saveRecord()");
    log.info("Calling prepareModelAndSave method ");
    return await this.prepareModelAndSave(requestPayload, model, modelDataResource, requestorProfileId, requestorProfileId);
  }

  /**
   * Function to Update resources with MetaData and ID and calls DAO service to save the resources.
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @param {*} createdBy Id of logged in user
   * @param {*} updatedBy Id of logged in user
   * @return {Promise<any>}
   */
  public static async prepareModelAndSave(requestPayload, model, modelDataResource, createdBy: string, updatedBy: string) {
    const result = { savedRecords: [], errorRecords: [] };
    requestPayload.forEach((record, index) => {
      record.meta = DataTransform.getRecordMetaData(record, createdBy, updatedBy);
      record.id = uuid();
      record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
      requestPayload[index] = record;
    });
    await DAOService.bulkSave(requestPayload, model);
    log.info("Bulk Save successfully :: saveRecord()");
    result.savedRecords = requestPayload.map((record) => {
      return record.dataResource;
    });
    return result;
  }
}
