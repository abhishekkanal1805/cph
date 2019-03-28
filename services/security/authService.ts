import * as log from "lambda-log";
import { Op } from "sequelize";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { DataSource } from "../../dataSource";
import { Connection } from "../../models/CPH/connection/connection";
import { Utility } from "../common/Utility";

export class AuthService {
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
      DataSource.addModel(Connection);
      const searchPatientResults = await Connection.findAll(queryOptions);
      records.forEach((record) => {
        if (searchPatientResults.includes(Utility.getAttributeValue(record, patientValidationId))) {
          // practioner can do all operation if connection exists?
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
