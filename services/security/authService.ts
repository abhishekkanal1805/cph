import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { DataService } from "../dao/dataService";
import { DataFetch } from "../utilities/dataFetch";
import { RequestValidator } from "../validators/requestValidator";

export class AuthService {
  /**
   *  Wrapper class to perform all User access authentication
   *
   * @static
   * @param {string} profile profileId of logged in User
   * @param {string[]} userIds User Id references
   * @param {string[]} patientIds patientId references
   * @memberof AuthService
   */
  public static async performAutorization(profile: string, userIds: string[], patientIds: string[]) {
    log.info("Entering AuthService :: performMultiUserValidation()");
    const loggedInUserInfo = await DataFetch.fetchUserProfileInformationFromAuthorizer(profile);
    log.info("UserProfile information retrieved successfully :: saveRecord()");
    if (loggedInUserInfo.profileType.toLowerCase() != Constants.SYSTEM_USER) {
      RequestValidator.validateNumberOfUniqueUserReference(userIds);
      RequestValidator.validateUniquePatientReference(patientIds);
      RequestValidator.validateUserReferenceAgainstLoggedInUser(loggedInUserInfo.loggedinId, userIds[0]);
    }
    const patientId = patientIds[0].split("/")[1];
    await AuthService.performUserAccessValidation(loggedInUserInfo.loggedinId, loggedInUserInfo.profileType, patientId);
  }

  /**
   * Checks logged in user type and filter records based on his access type.
   *
   * @static
   * @param {*} loggedInUserInfo : logged in user info coming from Authorizer data
   * @param {string[]} patientIds : patient Ids based on request fields like subject's reference value
   * @param {string} patientValidationId : validation field for patient. e.g. subject.reference
   * @param {any[]} records : array of records to be saved
   * @returns
   * @memberof AuthService
   */
  public static async performUserAccessValidation(profileId: string, profileType: string, patientId: string) {
    log.info("Entering AuthService :: performMultiUserValidation()");
    profileType = profileType.toLowerCase();
    if (profileType === Constants.SYSTEM_USER) {
      return;
    } else if (profileType === Constants.PATIENT_USER) {
      if (patientId != profileId) {
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    } else if (profileType === Constants.PRACTITIONER_USER || profileType === Constants.CAREPARTNER_USER) {
      const queryOptions = {
        where: {
          from: patientId,
          to: profileId,
          status: [Constants.CONNECTION_ACTIVE]
        }
      };
      const count = await DataService.recordsCount(queryOptions, Connection);
      if (count != 1) {
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    }
  }
}
