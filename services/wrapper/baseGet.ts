import * as log from "lambda-log";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
import { JsonParser } from "../utilities/jsonParser";

export class BaseGet {
  /**
   *
   *
   * @static
   * @param {string} id
   * @param {*} model
   * @param {string} requestorProfileId
   * @param {*} userElement
   * @param {*} patientElement
   * @returns
   * @memberof BaseGet
   */
  public static async getRecord(id: string, model, requestorProfileId: string, patientElement) {
    log.info("In BaseGet :: getRecord()");
    const options = { "meta.isDeleted": false };
    let record = await DAOService.fetchRowByPkQuery(id, model, options);
    record = record.dataResource;
    const patientId = JsonParser.findValuesForKey([record], patientElement, false);
    log.info("getRecord() :: Authorization started");
    const loggedInUserInfo = await DataFetch.getUserProfile(requestorProfileId);
    log.info("UserProfile information retrieved successfully :: saveRecord()");
    await AuthService.hasConnectionBasedAccess(loggedInUserInfo.loggedinId, loggedInUserInfo.profileType, patientId[0]);
    log.info("getRecord() :: Record retrieved successfully");
    return record;
  }
}
