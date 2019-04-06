import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { DataService } from "../dao/dataService";
import { DataFetch } from "../utility/dataFetch";
import { RequestValidator } from "../validators/requestValidator";

export class AuthService {
  public static async performAuthentication(profile: string, userIds: string[], patientIds: string[]) {
    log.info("Entering AuthService :: performMultiUserValidation()");
    const loggedInUserInfo = await DataFetch.fetchUserProfileInformationFromAuthorizer(profile);
    log.info("UserProfile information retrieved successfully :: saveRecord()");
    if (loggedInUserInfo.profileType.toLowerCase() != Constants.SYSTEM_USER) {
      RequestValidator.validateNumberOfUniqueUserReference(userIds);
      RequestValidator.validateUniquePatientReference(patientIds);
      RequestValidator.validateUserReferenceAgainstLoggedInUser(loggedInUserInfo.loggedinId, userIds[0]);
    }
    await AuthService.performUserAccessValidation(loggedInUserInfo.loggedinId, loggedInUserInfo.profileType, patientIds[0]);
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
  public static async performUserAccessValidation(loggedInUserId: string, loggedInUserType: string, patientId: string) {
    log.info("Entering AuthService :: performMultiUserValidation()");
    loggedInUserType = loggedInUserType.toLowerCase();
    if (loggedInUserType === Constants.SYSTEM_USER) {
      return;
    } else if (loggedInUserType === Constants.PATIENT_USER) {
      if (patientId != loggedInUserId) {
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    } else if (loggedInUserType === Constants.PRACTITIONER_USER || loggedInUserType === Constants.CAREPARTNER_USER) {
      const queryOptions = {
        where: {
          from: patientId,
          to: loggedInUserId,
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
