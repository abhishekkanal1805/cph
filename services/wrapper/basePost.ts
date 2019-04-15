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
    if (!Array.isArray(requestPayload.entry)) {
      requestPayload = [requestPayload];
    } else {
      const total = requestPayload.total;
      requestPayload = requestPayload.entry.map((entry) => entry.resource);
      RequestValidator.validateBundleTotal(requestPayload, total);
      RequestValidator.validateBundlePostLimit(requestPayload, Constants.POST_LIMIT);
    }
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
    const patientId = patientIds[0].split("/")[1];
    const informationSourceId = informationSourceIds[0].split("/")[1];
    await AuthService.performAuthorization(requestorProfileId, informationSourceId, patientId);
    log.info("User Authorization successfully :: saveResource()");
    const result = { savedRecords: [], errorRecords: [] };
    // TODO above 2 lines need to be update once response builder is fixed.
    requestPayload.forEach((record, index) => {
      record.meta = DataTransform.getRecordMetaData(record, requestorProfileId, requestorProfileId);
      record.id = uuid();
      record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
      requestPayload[index] = record;
    });
    await DAOService.bulkSave(requestPayload, model);
    log.info("Bulk Save successfully :: saveResource()");
    result.savedRecords = requestPayload.map((record) => {
      return record.dataResource;
    });
    return result;
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
    const result: any = { savedRecords: [], errorRecords: [] };
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
