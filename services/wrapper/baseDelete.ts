import * as log from "lambda-log";
import { DAOService } from "../dao/daoService";
import { BaseGet } from "./baseGet";

export class BaseDelete {
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
  public static async deleteRecord(id, model, modelDataResource, requestorProfileId: string, userElement, patientElement, permanent: boolean) {
    log.info("In BaseGet :: getRecord()");
    const record = await BaseGet.getRecord(id, model, requestorProfileId, userElement, patientElement);
    if (permanent) {
      log.info("Deleting item Permanently");
      await DAOService.delete(id, model);
    } else {
      log.info("Soft deleting the item" + id);
      record.meta.isDeleted = true;
      await DAOService.softDelete(id, record, model, modelDataResource);
    }
  }
}
