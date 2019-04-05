import * as log from "lambda-log";
import * as uuid from "uuid";
import { Constants } from "../../common/constants/constants";
import { DataHelperService } from "../common/dataHelperService";
import { DataService } from "../common/dataService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utility/dataFetch";
import { DataTransform } from "../utility/dataTransform";
import { JsonParser } from "../utility/jsonParser";
import { RequestValidator } from "../validators/requestValidator";

export class BasePost {

  /**
   *
   *
   * @static
   * @param {*} records
   * @param {string} userReferenceKey
   * @param {string} patientReferenceKey
   * @param {*} authorizerData
   * @param {*} model
   * @param {*} modelDataResource
   * @returns
   * @memberof BasePost
   */
  public static async saveRecord(records, patientReferenceKey: string, profile : string, model, modelDataResource) {
    // remove model data resource as it has to be mandatory.
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
    // authorizerData to context.profile only 
    // merge line 37-44 :: peformAuthorization()
    const loggedInUserInfo = await DataFetch.fetchUserProfileInformationFromAuthorizer(profile);
    log.info("UserProfile information retrieved successfully :: saveRecord()");
    if (loggedInUserInfo.profileType.toLowerCase() != Constants.SYSTEM_USER) {
      RequestValidator.validateNumberOfUniqueUserReference(userIds);
      RequestValidator.validateUniquePatientReference(patientIds);
      RequestValidator.validateUserReferenceAgainstLoggedInUser(loggedInUserInfo.loggedinId, userIds[0]);
    }
    await AuthService.performUserAccessValidation(loggedInUserInfo.loggedinId, loggedInUserInfo.profileType, patientIds[0]);
    const result: any = { saveRecords: [], errorRecords: [] };
    result.saveRecords = records;
    // TODO above 2 lines need to be update once response builder is fixed.
    log.info("User Authentication and record filtering successfully :: saveRecord()");
    result.saveRecords.forEach((record) => {
      record.meta = DataTransform.getRecordMetaData(record, loggedInUserInfo.loggedinId, loggedInUserInfo.loggedinId);
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

  // fhir :: remove information source checks ... another save 
}
