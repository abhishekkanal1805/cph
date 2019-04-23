import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { UnAuthorizedResult } from "../../common/objects/custom-errors";
import { DataHelperService } from "../common/dataHelperService";
import { DAOService } from "../dao/daoService";
import { BaseGet } from "./baseGet";

export class BaseDelete {
  /**
   *  Wrapper function to perform save for CPH users
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requesterProfileId requestorProfileId Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BaseDelete
   */
  public static async deleteResource(id, model, modelDataResource, requesterProfileId: string, patientElement, permanent) {
    log.info("In BaseDelete :: deleteResource()");
    let record = await BaseGet.getResource(id, model, requesterProfileId, patientElement);
    if (permanent === true || permanent === "true") {
      log.info("Deleting item Permanently :: deleteResource()");
      await DAOService.delete(id, model);
    } else if (permanent === false || permanent === "false") {
      log.info("Soft deleting the item" + id);
      record.meta.isDeleted = true;
      record.meta.lastUpdated = new Date().toISOString();
      record = DataHelperService.convertToModel(record, model, modelDataResource);
      await DAOService.softDelete(id, record, model);
    } else {
      log.info("Invalid parameter value for permanent flag :: deleteResource()");
      throw new UnAuthorizedResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + Constants.PERMANENT);
    }
  }

  /**
   *  Wrapper function to perform delete for multiple resources base on provided parameters
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requestorProfileId requestorProfileId Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BaseDelete
   */
  public static async deleteResources(resourcesToBeDeleted, criteriaToDelete, model, modelDataResource, permanent) {
    /* TODO: endpoint has to be removed from function contract as per new search implementation */
    log.info("In BaseDelete :: deleteResource()");
    if (permanent === true || permanent === "true") {
      log.info("Deleting item Permanently");
      await DAOService.deleteWithCriteria(criteriaToDelete, model);
    } else if (permanent === false || permanent === "false") {
      for (let eachRecord of resourcesToBeDeleted) {
        log.info("Soft deleting the item" + eachRecord.id);
        eachRecord.meta.isDeleted = true;
        eachRecord.meta.lastUpdated = new Date().toISOString();
        eachRecord = DataHelperService.convertToModel(eachRecord, model, modelDataResource);
        await DAOService.softDelete(eachRecord.id, eachRecord, model);
      }
    } else {
      log.info("Invalid parameter value for permanent flag :: deleteResource()");
      throw new UnAuthorizedResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + Constants.PERMANENT);
    }
  }
}
