import * as log from "lambda-log";
import { Op } from "sequelize";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { Utility } from "../common/Utility";

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
  public static async performUserAccessValidation(loggedInUserInfo: any, patientIds: string[], patientValidationId: string, records: any[]) {
    log.info("Entering UserService :: performMultiUserValidation()");
    const loggedInId = loggedInUserInfo.loggedinId;
    const loggedInUserType = loggedInUserInfo.profileType.toLowerCase();
    const result = {
      errorRecords: [],
      saveRecords: []
    };
    if (loggedInUserType === "system") {
      result.saveRecords = records;
    } else if (loggedInUserType === "patient") {
      records.forEach((record) => {
        if (Utility.getAttributeValue(record, patientValidationId) === "UserProfile/" + loggedInId) {
          result.saveRecords.push(record);
        } else {
          const badRequest = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
          badRequest.clientRequestId = record.meta ? record.meta.clientRequestId : "";
          result.errorRecords.push(badRequest);
        }
      });
    } else if (loggedInUserType === "practitioner" || loggedInUserType === "carepartner") {
      const queryOptions = {
        where: {
          from: {
            [Op.or]: patientIds
          },
          to: loggedInId,
          status: ["active"]
        },
        attributes: ["from"]
      };
      const searchPatientResults = await Connection.findAll(queryOptions);
      records.forEach((record) => {
        if (searchPatientResults.includes(Utility.getAttributeValue(record, patientValidationId))) {
          result.saveRecords.push(record);
        } else {
          const badRequest = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
          badRequest.clientRequestId = record.meta ? record.meta.clientRequestId : "";
          result.errorRecords.push(badRequest);
        }
      });
    }
    return result;
  }
}
