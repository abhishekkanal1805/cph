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
   *
   * @static
   * @param {string} profile profileId of logged in User
   * @param {string[]} informationSourceIds User Id references
   * @param {string[]} patientIds patientId references
   * @memberof AuthService
   */
  public static async performAuthorization(requestor: string, informationSourceReferenceValue: string, patientReferenceValue: string) {
    log.info("Entering AuthService :: performAuthorization()");
    const requestorUserProfile = await DataFetch.getUserProfile(requestor);
    requestorUserProfile.profileId = [Constants.USERPROFILE, requestorUserProfile.profileId].join("/");
    log.info("requestorUserProfile information retrieved successfully :: saveRecord()");
    if (requestorUserProfile.profileType.toLowerCase() != Constants.SYSTEM_USER) {
      if (requestorUserProfile.profileId != informationSourceReferenceValue) {
        log.error("Error: Logged In Id is different from user Reference Id");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
      await AuthService.hasConnectionBasedAccess(requestorUserProfile.profileId, requestorUserProfile.profileType, patientReferenceValue);
    }
  }

  /**
   *  Wrapper class to perform FHIR User access authorization
   *
   * @static
   * @param {string} profile profileId of logged in User
   * @param {string[]} informationSourceIds User Id references
   * @param {string[]} patientIds patientId references
   * @memberof AuthService
   */
  public static async performAuthorizationforFHIR(requestor: string, patientId: string) {
    log.info("Entering AuthService :: performAuthorization()");
    const requestorUserProfile = await DataFetch.getUserProfile(requestor);
    log.info("requestorUserProfile information retrieved successfully :: saveRecord()");
    if (requestorUserProfile.profileType.toLowerCase() != Constants.SYSTEM_USER) {
      requestorUserProfile.profileId = [Constants.USERPROFILE, requestorUserProfile.profileId].join("/");
      await AuthService.hasConnectionBasedAccess(requestorUserProfile.profileId, requestorUserProfile.profileType, patientId);
    }
  }

  /**
   *
   *
   * @static
   * @param {string} to logged in profile ID
   * @param {string} profileType logged in profile Type
   * @param {string} from patient ID coming from request bundle
   * @returns
   * @memberof AuthService
   */
  public static async hasConnectionBasedAccess(to: string, profileType: string, from: string) {
    log.info("Entering AuthService :: hasConnectionBasedAccess()");
    profileType = profileType.toLowerCase();
    if (profileType === Constants.SYSTEM_USER) {
      log.info("Logged in user type is System.");
      return;
    } else if (profileType === Constants.PATIENT_USER) {
      if (from != to) {
        log.info("Logged In ID is different from user reference ID in bundle.");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    } else if (profileType === Constants.PRACTITIONER_USER || profileType === Constants.CAREPARTNER_USER) {
      log.info("Logged In ID is either Practitioner or CarePartner.");
      log.info("In hasConnectionBasedAccess().");
      const queryOptions = {
        where: {
          "from.reference": from,
          "to.reference": to,
          "status": [Constants.ACTIVE]
        }
      };
      const count = await DAOService.recordsCount(queryOptions, Connection);
      if (count != 1) {
        log.info("No connection found between from and to");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    }
  }

  /**
   * Validates access between to and from without making a connection check
   *
   * @static
   * @param {string} to logged in profile ID
   * @param {string} profileType logged in profile Type
   * @param {string} from patient ID coming from request bundle
   * @returns
   * @memberof AuthService
   */
  public static async hasConnectionIndependentAccess(to: string, profileType: string, from: string) {
    log.info("Entering AuthService :: hasConnectionIndependentAccess()");
    profileType = profileType.toLowerCase();
    if (profileType === Constants.SYSTEM_USER) {
      log.info("Logged in user type is System.");
      return;
    } else if (profileType === Constants.PATIENT_USER) {
      if (from != to) {
        log.info("Logged In ID is different from user reference ID in bundle.");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    }
  }

  /**
   * Return true if user has access to make the request.
   *
   * @static
   * @param {string} to logged in profile ID
   * @param {string} profileType logged in profile Type
   * @param {string} from patient ID coming from request bundle
   * @returns {Promise<boolean>}
   * @memberof AuthService
   */
  public static async isUserAllowedAccess(to: string, profileType: string, from: string): Promise<boolean> {
    log.info("Entering AuthService :: isUserAllowedAccess()");
    profileType = profileType.toLowerCase();
    if (profileType === Constants.SYSTEM_USER) {
      log.info("Logged in user type is System.");
      return true;
    } else if (profileType === Constants.PATIENT_USER) {
      if (from != to) {
        log.info("Logged In ID is different from user reference ID in bundle.");
        return false;
      }
    } else if (profileType === Constants.PRACTITIONER_USER || profileType === Constants.CAREPARTNER_USER) {
      log.info("Logged In ID is either Practitioner or CarePartner.");
      const queryOptions = {
        where: {
          from,
          to,
          status: [Constants.ACTIVE]
        }
      };
      const count = await DAOService.recordsCount(queryOptions, Connection);
      if (count != 1) {
        log.info("No connection found between user Id and patient Id");
        return false;
      }
    }
    log.info("Entering AuthService :: isUserAllowedAccess()");
    return true;
  }
}
