import * as log from "lambda-log";
import * as uuid from "uuid";
import { Constants } from "../../common/constants/constants";
import { DataHelperService } from "../common/dataHelperService";
import { DataService } from "../common/dataService";
import { AuthService } from "../security/authService";
import { DataTransform } from "../utility/dataTransform";
import { JsonParser } from "../utility/jsonParser";
import { RequestValidator } from "../validators/requestValidator";

export class BasePost {
  /**
   *  Wrapper function to perform save for CPH users
   *
   * @static
   * @param {*} records Records array in JSON format
   * @param {string} patientReferenceKey patient reference key like subject.reference
   * @param {*} profile profile Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BasePost
   */
  public static async saveRecord(records, patientReferenceKey: string, profile: string, model, modelDataResource) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    if (!Array.isArray(records.entry)) {
      records = [records];
    } else {
      const total = records.total;
      records = records.entry.map((entry) => entry.resource);
      RequestValidator.validateBundleTotal(records, total);
      RequestValidator.validateBundlePostLimit(records, Constants.POST_LIMIT);
    }
    log.info("Record Array created succesfully in :: saveRecord()");
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientReferenceKey, []);
    keysToFetch.set(Constants.INFORMATION_SOURCE_REFERENCE_KEY, []);
    const response = JsonParser.findValuesForKeyMap(records, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveRecord()");
    const uniqueDeviceId = [...new Set(response.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceId);
    // patientvalidationid
    const patientIds: any = [...new Set(response.get(patientReferenceKey))];
    // userids
    const userIds = [...new Set(response.get(Constants.INFORMATION_SOURCE_REFERENCE_KEY))];
    // perform authentication
    await AuthService.performAuthentication(profile, userIds, patientIds);
    log.info("User Authentication successfully :: saveRecord()");
    const result: any = { saveRecords: [], errorRecords: [] };
    result.saveRecords = records;
    // TODO above 2 lines need to be update once response builder is fixed.
    result.saveRecords.forEach((record) => {
      record.meta = DataTransform.getRecordMetaData(record, profile, profile);
      record.id = uuid();
      record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
    });
    DataService.bulkSave(result.saveRecords, model);
    log.info("Bulk Save successfully :: saveRecord()");
    result.savedRecords = result.saveRecords.map((record) => {
      return record.dataResource ? record.dataResource : record;
    });
    return result;
  }
}
