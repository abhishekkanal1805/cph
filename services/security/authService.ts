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
  public static async performAuthorization(requestor: string, userId: string, patient: string) {
    log.info("Entering AuthService :: performAuthorization()");
    const loggedInUserInfo = await DataFetch.getUserProfile(requestor);
    log.info("UserProfile information retrieved successfully :: saveRecord()");
    if (loggedInUserInfo.profileType.toLowerCase() != Constants.SYSTEM_USER) {
      RequestValidator.validateUserReferenceAgainstLoggedInUser(loggedInUserInfo.loggedinId, userId);
    }
    await AuthService.checkUserTypeBasedAccess(loggedInUserInfo.loggedinId, loggedInUserInfo.profileType, patient);
  }

  /**
   *
   *
   * @static
   * @param {string} profileId logged in profile ID
   * @param {string} profileType logged in profile Type
   * @param {string} patientId patient ID coming from request bundle
   * @returns
   * @memberof AuthService
   */
  public static async checkUserTypeBasedAccess(profileId: string, profileType: string, patientId: string) {
    log.info("Entering AuthService :: checkUserTypeBasedAccess()");
    profileType = profileType.toLowerCase();
    if (profileType === Constants.SYSTEM_USER) {
      log.info("Logged in user type is System.");
      return;
    } else if (profileType === Constants.PATIENT_USER) {
      if (patientId != profileId) {
        log.info("Logged In ID is different from user reference ID in bundle.");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    } else if (profileType === Constants.PRACTITIONER_USER || profileType === Constants.CAREPARTNER_USER) {
      log.info("Logged In ID is either Practitioner or CarePartner.");
      if (!(await AuthService.hasConnectionBasedAccess(patientId, profileId))) {
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    }
  }

  /**
   * Find connection between from and to by going to connection Table
   *
   * @static
   * @param {string} from
   * @param {string} to
   * @returns
   * @memberof AuthService
   */
  public static async hasConnectionBasedAccess(from: string, to: string): Promise<boolean> {
    log.info("In hasConnectionBasedAccess().");
    const queryOptions = {
      where: {
        from,
        to,
        status: [Constants.ACTIVE]
      }
    };
    const count = await DataService.recordsCount(queryOptions, Connection);
    if (count != 1) {
      log.info("No connection found between from and to");
      return false;
    }
    return true;
  }

  /**
   * Return true if user has access to make the request.
   *
   * @static
   * @param {string} profileId logged in profile ID
   * @param {string} profileType logged in profile Type
   * @param {string} patientId patient ID coming from request bundle
   * @returns {Promise<boolean>}
   * @memberof AuthService
   */
  public static async isUserAllowedAccess(profileId: string, profileType: string, patientId: string): Promise<boolean> {
    log.info("Entering AuthService :: isUserAllowedAccess()");
    profileType = profileType.toLowerCase();
    if (profileType === Constants.SYSTEM_USER) {
      log.info("Logged in user type is System.");
      return true;
    } else if (profileType === Constants.PATIENT_USER) {
      if (patientId != profileId) {
        log.info("Logged In ID is different from user reference ID in bundle.");
        return false;
      }
    } else if (profileType === Constants.PRACTITIONER_USER || profileType === Constants.CAREPARTNER_USER) {
      log.info("Logged In ID is either Practitioner or CarePartner.");
      const queryOptions = {
        where: {
          from: patientId,
          to: profileId,
          status: [Constants.ACTIVE]
        }
      };
      const count = await DataService.recordsCount(queryOptions, Connection);
      if (count != 1) {
        log.info("No connection found between user Id and patient Id");
        return false;
      }
    }
    log.info("Entering AuthService :: isUserAllowedAccess()");
    return true;
  }
}
