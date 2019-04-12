import * as log from "lambda-log";
import * as uuid from "uuid";
import {Constants} from "../../common/constants/constants";
import {DataHelperService} from "../common/dataHelperService";
import {DAOService} from "../dao/daoService";
import {AuthService} from "../security/authService";
import {DataTransform} from "../utilities/dataTransform";
import {JsonParser} from "../utilities/jsonParser";
import {RequestValidator} from "../validators/requestValidator";

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
  public static async saveCPHRecord(requestPayload, patientElement: string, requestorProfileId: string, model, modelDataResource) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    if (!Array.isArray(requestPayload.entry)) {
      requestPayload = [requestPayload];
    } else {
      const total = requestPayload.total;
      requestPayload = requestPayload.entry.map((entry) => entry.resource);
      RequestValidator.validateBundleTotal(requestPayload, total);
      RequestValidator.validateBundlePostLimit(requestPayload, Constants.POST_LIMIT);
    }
    log.info("Record Array created succesfully in :: saveRecord()");
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientElement, []);
    keysToFetch.set(Constants.INFORMATION_SOURCE_REFERENCE_KEY, []);
    const response = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveRecord()");
    const uniqueDeviceIds = [...new Set(response.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    // patientvalidationid
    const patientIds = [...new Set(response.get(patientElement))];
    // userids
    const informationSourceIds = [...new Set(response.get(Constants.INFORMATION_SOURCE_REFERENCE_KEY))];
    // perform Authorization
    await RequestValidator.validateDeviceAndProfile(uniqueDeviceIds, informationSourceIds, patientIds);
    // We can directly use 0th element as we have validated the uniqueness of reference key in validateDeviceAndProfile
    const patientId = patientIds[0];
    const informationSourceId = informationSourceIds[0].split("/")[1];
    await AuthService.performAuthorization(requestorProfileId, informationSourceId, patientId);
    log.info("User Authorization is successful ");
    log.info("Calling prepareAndSaveModel method ");
    return await this.prepareAndSaveModel(requestPayload, model, modelDataResource, requestorProfileId, requestorProfileId);
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
  public static async saveFHIRRecord(requestPayload, patientElement: string, requestorProfileId: string, model, modelDataResource) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    if (!Array.isArray(requestPayload.entry)) {
      requestPayload = [requestPayload];
    } else {
      const total = requestPayload.total;
      requestPayload = requestPayload.entry.map((entry) => entry.resource);
      RequestValidator.validateBundleTotal(requestPayload, total);
      RequestValidator.validateBundlePostLimit(requestPayload, Constants.POST_LIMIT);
    }
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
    const patientId = patientIds[0];
    // FHIR services don't have informationSource validation so created new function for authorization
    await AuthService.performAuthorizationforFHIR(requestorProfileId, patientId);
    log.info("User Authorization successfully :: saveRecord()");
    log.info("Calling prepareAndSaveModel method ");
    return await this.prepareAndSaveModel(requestPayload, model, modelDataResource, requestorProfileId, requestorProfileId);
  }

  /***
   * Wrapper function to prepare model and save model
   * @param {any[]} requestPayload
   * @param model
   * @param modelDataResource
   * @param createdBy
   * @param updatedBy
   * @returns {Promise<any>}
   */
  public static async prepareAndSaveModel(requestPayload: any[], model: any, modelDataResource: any, createdBy: string, updatedBy: string) {
    const result = { savedRecords: [], errorRecords: [] };
    // TODO above 2 lines need to be update once response builder is fixed.
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
