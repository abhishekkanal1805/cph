import * as log from "lambda-log";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
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
  public static async getRecord(id: string, model, requestorProfileId: string, userElement, patientElement) {
    log.info("In BaseGet :: getRecord()");
    const options = { "meta.isDeleted": false };
    let record = await DAOService.fetchRowByPkQuery(id, model, options);
    record = record.dataResource;
    const userId = JsonParser.findValuesForKey([record], userElement);
    const patientId = JsonParser.findValuesForKey([record], patientElement);
    log.info("getRecord() :: Authorization started");
    await AuthService.performAuthorization(requestorProfileId, userId[0], patientId[0]);
    log.info("getRecord() :: Record retrieved successfully");
    return record;
  }
}
