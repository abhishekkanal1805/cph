import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { DataService } from "../dao/dataService";

export class AuthService {
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
  public static async performUserAccessValidation(loggedInUserInfo: any, patientId: string) {
    log.info("Entering AuthService :: performMultiUserValidation()");
    const loggedInId = loggedInUserInfo.loggedinId;
    const loggedInUserType = loggedInUserInfo.profileType.toLowerCase();
    if (loggedInUserType === Constants.SYSTEM_USER) {
      return;
    } else if (loggedInUserType === Constants.PATIENT_USER) {
      if (patientId != loggedInId) {
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    } else if (loggedInUserType === Constants.PRACTITIONER_USER || loggedInUserType === Constants.CAREPARTNER_USER) {
      const queryOptions = {
        where: {
          from: patientId,
          to: loggedInId,
          status: [Constants.CONNECTION_ACTIVE]
        },
        attributes: [Constants.CONNECTION_FROM]
      };
      const count = await DataService.recordsCount(queryOptions, Connection);
      if (count != 1) {
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    }
  }
}
