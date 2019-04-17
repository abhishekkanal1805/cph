import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { DAOService } from "../dao/daoService";
import { DataFetch } from "../utilities/dataFetch";

export class AuthService {
  /**
   *  Wrapper class to perform all User access authentication
   * handles multiple scenarios, if requestor is same as informationSource and patient, all access allowed except system user can't be information source
   * if requestor is system user it can post data if it is not informationSource
   * if requestor is not system user, a valid connection is expected between informationSource and patient
   * @static
   * @param {string} profile profileId of logged in User
   * @param {string[]} informationSourceIds User Id references in format UserProfile/123
   * @param {string[]} patientIds patientId references in format UserProfile/123
   * @memberof AuthService
   */
  public static async performAuthorization(requestor: string, informationSourceReferenceValue: string, patientReferenceValue: string) {
    log.info("Entering AuthService :: performAuthorization()");
    const requestorUser = await DataFetch.getUserProfile([requestor]);
    const requestorUserProfile = requestorUser[requestor];
    requestorUserProfile.profileId = Constants.USERPROFILE_REFERENCE + requestor;
    log.info("requestorUserProfile information retrieved successfully :: saveRecord()");
    if (requestorUserProfile.profileType.toLowerCase() != Constants.SYSTEM_USER) {
      if (requestor === informationSourceReferenceValue && requestor === patientReferenceValue) {
        log.info("request is for requestor's own resource");
        return;
      } else {
        await AuthService.hasConnectionBasedAccess(informationSourceReferenceValue, patientReferenceValue);
      }
    } else if (requestorUserProfile.profileType.toLowerCase() === Constants.SYSTEM_USER ) {
      if (informationSourceReferenceValue && requestor === patientReferenceValue) {
      log.error("requestor is valid system user but system user can not be information source or patient");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    } else if (requestor === informationSourceReferenceValue) {
      log.error("requestor is valid system user but information source can not be same as system user");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    } else if (requestor !== informationSourceReferenceValue && requestor !== patientReferenceValue) {
      log.info("requestor is valid system user and not same as information source and not same as patient");
      const userprofilesToCheck: string[] = [];
      userprofilesToCheck.push(informationSourceReferenceValue);
      userprofilesToCheck.push(patientReferenceValue);
      const isUserProfileValid = await this.isUserValid(userprofilesToCheck);
      if (!isUserProfileValid) {
        log.error("requestor is System user but either informationSource user profile or patient user profile is not valid and active");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    }
    }
  }

  /**
   *
   *
   * @static
   * @param {string} to logged in profile ID in format UserProfile/123
   * @param {string} profileType logged in profile Type
   * @param {string} from patient ID coming from request bundle in format UserProfile/123
   * @returns
   * @memberof AuthService
   */
  public static async hasConnectionBasedAccess(requestor: string, requestee: string) {
    log.info("Inside AuthService :: hasConnectionBasedAccess()");
    const userprofilesToCheck: string[] = [];
    userprofilesToCheck.push(requestee);
    const isUserProfilesValid = await this.isUserValid(userprofilesToCheck);
    if (!isUserProfilesValid) {
      log.error("requestee is not valid and active userprofile");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    if (requestor === requestee) {
      log.info("Exiting AuthService :: hasConnectionBasedAccess");
      return;
    }
    const requestorUserProfile = await DataFetch.getUserProfile([requestor]);
    requestorUserProfile.profileId = Constants.USERPROFILE_REFERENCE + requestorUserProfile.profileId;
    log.info("requestorUserProfile information retrieved successfully ");
    if (requestorUserProfile.profileType.toLowerCase() !== Constants.SYSTEM_USER) {
      const queryOptions = {
        where: {
          "from.reference": requestor,
          "to.reference": requestee,
          "status": [Constants.ACTIVE]
        }
      };
      const count = await DAOService.recordsCount(queryOptions, Connection);
      if (count != 1) {
        log.error("No connection found between " + requestor + "and " + requestee);
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    }
    log.info("Exiting AuthService :: hasConnectionBasedAccess");
  }

  /**
   * @param {string[]} userProfileIds
   */
  public static async isUserValid(userProfileIds: string[]) {
    log.info("Entering AuthService :: isUserValid()");
    let result: boolean = true;
    const validUserProfileIds = await DataFetch.getValidUserProfileIds(userProfileIds);
    if (validUserProfileIds.length !== userProfileIds.length) {
      result = false;
    }
    log.info("Exiting AuthService :: isUserValid()");
    return result;
  }
  }
