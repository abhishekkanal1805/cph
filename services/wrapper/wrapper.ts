import * as log from "lambda-log";
import * as uuid from "uuid";
import { AuthService, BusinessValidator, Connection, DataFetch, DataHelperService, DataService, DataTransform, Device, JsonParser, UserProfile } from "../..";

export class Wrapper {
  public static async saveRecord(records, authorizerData, sequelizeModel, modelDataResource) {
    if (!Array.isArray(records.entry)) {
      records = [records];
    } else {
      const total = records.total;
      records = records.entry.map((entry) => entry.resource);
      BusinessValidator.validateBundleTotal(records, total);
      BusinessValidator.validateBundlePostLimit(records);
    }
    log.info("Record Array created succesfully in :: saveRecord()");
    const keysToFetch = new Map();
    keysToFetch.set("meta.deviceId", []);
    keysToFetch.set("subject.reference", []);
    keysToFetch.set("informationSource.reference", []);
    const response = JsonParser.findValuesForKeyMap(records, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveRecord()");
    const uniqueDeviceId = [...new Set(response.get("meta.deviceId"))].filter(Boolean);
    DataSource.addModel(Device);
    await BusinessValidator.validateDeviceIds(uniqueDeviceId);
    // patientvalidationid
    const subjectReferences: any = [...new Set(response.get("subject.reference"))];
    // userids
    const informationReferences = [...new Set(response.get("informationSource.reference"))];
    BusinessValidator.validateNumberOfUniqueUserReference(informationReferences);
    DataSource.addModel(UserProfile);
    const loggedInUserInfo = await DataFetch.fetchUserProfileInformationFromAuthorizer(authorizerData);
    log.info("UserProfile information retrieved successfully :: saveRecord()");
    BusinessValidator.validateUserReferenceAgainstLoggedInUser(loggedInUserInfo.loggedinId, informationReferences[0]);
    DataSource.addModel(Connection);
    const result: any = await AuthService.performUserAccessValidation(loggedInUserInfo, subjectReferences, "subject.reference", records);
    log.info("User Authentication and record filtering successfully :: saveRecord()");
    result.saveRecords.forEach((record) => {
      record.meta = DataTransform.getRecordMetaData(record, loggedInUserInfo.loggedinId, loggedInUserInfo.loggedinId);
      record.id = uuid();
      record = DataHelperService.convertToModel(record, sequelizeModel, modelDataResource).dataValues;
    });
    DataService.bulkSave(result.saveRecords, sequelizeModel);
    log.info("Bulk Save successfully :: saveRecord()");
    result.savedRecords = result.saveRecords.map((record) => {
      return record.dataResource ? record.dataResource : record;
    });
    return result;
  }
}
