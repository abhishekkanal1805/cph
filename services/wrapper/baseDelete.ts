import * as log from "lambda-log";
import { DataHelperService } from "../common/dataHelperService";
import { DAOService } from "../dao/daoService";
import { BaseGet } from "./baseGet";
import { DataService } from "../common/dataService";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { NotFoundResult } from "../../common/objects/custom-errors";

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
   * @memberof BaseDelete
   */
  public static async deleteResource(id, model, modelDataResource, requestorProfileId: string, patientElement, permanent: boolean) {
    log.info("In BaseDelete :: deleteResource()");
    let record = await BaseGet.getResource(id, model, requestorProfileId, patientElement);
    if (permanent) {
      log.info("Deleting item Permanently");
      await DAOService.delete(id, model);
    } else {
      log.info("Soft deleting the item" + id);
      record.meta.isDeleted = true;
      record.meta.lastUpdated = new Date().toISOString();
      record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
      await DAOService.softDelete(id, record, model);
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
  public static async deleteResources(parameters, model, modelDataResource, requestorProfileId: string, patientElement, permanent: boolean, endpoint: string) {
    /* TODO: endpoint has to be removed from function contract as per new search implementation */
    log.info("In BaseDelete :: deleteResource()");
    /* TODO: Below search call has to be replaced with new implementation */
    const results: any = await DataService.searchDatabaseRows(parameters, model, endpoint, ["dataResource"]);
    if (results && results.length && results.length < 0) {
      const criteriaClause: any = DataHelperService.prepareSearchQuery(parameters, endpoint, ["dataResource"], undefined);
      if (permanent) {
        log.info("Deleting item Permanently");
        await DAOService.deleteWithCriteria(criteriaClause, model);
      } else {
        for (let eachRecord of results) {
          log.info("Soft deleting the item" + eachRecord.id);
          eachRecord.meta.isDeleted = true;
          eachRecord.meta.lastUpdated = new Date().toISOString();
          eachRecord = DataHelperService.convertToModel(eachRecord, model, modelDataResource).dataValues;
          await DAOService.softDelete(eachRecord.id, eachRecord, model);
        }
      }
    } else {
      log.info("No Records found to update for provided criteria");
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
  }
}
