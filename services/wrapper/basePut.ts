import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { NotFoundResult } from "../../common/objects/custom-errors";
import { DataHelperService } from "../common/dataHelperService";
import { DataService } from "../dao/dataService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
import { DataTransform } from "../utilities/dataTransform";
import { JsonParser } from "../utilities/jsonParser";
import { RequestValidator } from "../validators/requestValidator";

export class BasePut {
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
  public static async updateRecord(requestPayload, patientElement: string, requestorProfileId: string, model, modelDataResource) {
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
    log.info("Record Array created succesfully in :: saveRecord()");
    const keysToFetch = new Map();
    keysToFetch.set("id", []);
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientElement, []);
    keysToFetch.set(Constants.INFORMATION_SOURCE_REFERENCE_KEY, []);
    const response = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveRecord()");
    const uniqueDeviceIds = [...new Set(response.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    // patientvalidationid
    const patientIds: any = [...new Set(response.get(patientElement))];
    // userids
    const informationSourceIds = [...new Set(response.get(Constants.INFORMATION_SOURCE_REFERENCE_KEY))];
    // primary key Ids
    const primaryIds = [...new Set(response.get("id"))];
    // perform Authorization
    await RequestValidator.validateDeviceAndProfile(uniqueDeviceIds, informationSourceIds, patientIds);
    await RequestValidator.validateUniqueIDForPUT(primaryIds, total);
    // We can directly use 0th element as we have validated the uniqueness of reference key in validateDeviceAndProfile
    const patientId = patientIds[0].split("/")[1];
    const informationSourceId = informationSourceIds[0].split("/")[1];
    await AuthService.performAuthorization(requestorProfileId, informationSourceId, patientId);
    log.info("User Authorization successfully :: saveRecord()");
    const validPrimaryIds = await DataFetch.getValidIds(model, primaryIds);
    log.info("Valid primary Ids fetched successfully :: saveRecord()");
    const result: any = { savedRecords: [], errorRecords: [] };
    // TODO above 2 lines need to be update once response builder is fixed.
    requestPayload.forEach((record) => {
      const currentRecord = validPrimaryIds.find((validPrimaryId) => {
        return validPrimaryId.id === record.id;
      });
      if (currentRecord) {
        record.meta = DataTransform.getUpdateMetaData(record, currentRecord.meta, requestorProfileId, false);
        record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
        result.savedRecords.push(record);
      } else {
        const notFoundResult = new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
        notFoundResult.clientRequestId = record.clientRequestId;
        result.errorRecords.push(notFoundResult);
      }
    });
    await DataService.bulkSave(requestPayload, model);
    log.info("Bulk Save successfully :: saveRecord()");
    result.savedRecords = requestPayload.map((record) => {
      return record.dataResource ? record.dataResource : record;
    });
    return result;
  }
}
