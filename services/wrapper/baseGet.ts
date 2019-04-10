import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { DataService } from "../dao/dataService";
import { AuthService } from "../security/authService";
import { JsonParser } from "../utilities/jsonParser";
import { RequestValidator } from "../validators/requestValidator";

export class BaseGet {
  /**
   *  Wrapper function to perform save for CPH users
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requestorProfileId requestorProfileId Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BaseGet
   */
  public static async getRecord(id, model, requestorProfileId: string, userElement, patientElement) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    const options = {"meta.isDeleted":false}
    let record = await DataService.fetchRowByPkQuery(id, model,options);
    record = record.dataResource; 
    const userId = record[userElement];
    const patientId = record[patientElement];
    await AuthService.performAuthorization(requestorProfileId, userId, patientId);
    return record;
  }
}
