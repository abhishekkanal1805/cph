import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";
import { DataHelperService } from "../common/dataHelperService";
import { DataFetch } from "../utilities/dataFetch";
import { DataTransform } from "../utilities/dataTransform";

export class DAOService {
  /**
   * Fetch database record by its primary key
   *
   * @static
   * @param {string} id : primary key id
   * @param {*} serviceModel : sequelize model
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async fetchRowByPk(id: string, serviceModel: any): Promise<any> {
    log.info("Entering DAOService :: fetchRowByPk()");
    try {
      const results = await serviceModel.findByPk(id);
      return results.dataValues;
    } catch (err) {
      log.error("fetchRowByPk() :: Error in fetching the record :: " + err);
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
  }

  /**
   *
   *
   * @static
   * @param {string} id
   * @param {*} serviceModel
   * @param {*} options
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async fetchRowByPkQuery(id: string, serviceModel: any, options: any): Promise<any> {
    log.info("Entering DAOService :: fetchRowByPkQuery()");
    try {
      const results = await serviceModel.findByPk(id, options);
      return results.dataValues;
    } catch (err) {
      log.error("fetchRowByPkQuery() :: Error in fetching the record :: " + err);
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
  }

  /**
   * Fetch count of matching primary key
   *
   * @static
   * @param {string} id : id column of database. Can be used for other columns too but consuming application should be careful with count.
   * @param {*} serviceModel
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async recordsCount(query, serviceModel: any): Promise<any> {
    log.info("Entering DAOService :: recordsCount()");
    try {
      const count = await serviceModel.count(query);
      return count;
    } catch (err) {
      log.error("recordsCount() :: Error in counting records :: " + err);
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }
  }

  /**
   *  Bulk create records for given Model
   *
   * @static
   * @param {*} records
   * @param {*} serviceModel
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async bulkSave(records, serviceModel: any): Promise<any> {
    log.info("Entering DAOService :: bulkSave()");
    try {
      await serviceModel.bulkCreate(records);
      log.debug("Resource saved ");
    } catch (err) {
      log.error("Error while saving Record: " + err.stack);
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }
  }

  /**
   *  Bulk create records for given Model
   *
   * @static
   * @param {*} query
   * @param {*} model
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async search(model, query): Promise<any> {
    log.info("Entering DAOService :: search()");
    try {
      const result = model.findAll(query);
      return result;
    } catch (err) {
      log.error("Error while saving Record: " + err.stack);
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }
  }

  /**
   *
   *
   * @static
   * @param {string} id
   * @param {*} serviceModel
   * @returns {Promise<object>}
   * @memberof DAOService
   */
  public static delete(id: string, serviceModel: any): Promise<object> {
    log.info("Entering DAOService :: delete");
    return serviceModel
      .destroy({ where: { id } })
      .then((rowsDeleted: any) => {
        log.info("Exiting DAOService: delete() :: Record deleted successfully");
        return rowsDeleted;
      })
      .catch((err) => {
        log.error("Error in delete the record :: " + err.stack);
        throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
      });
  }

  /**
   *  Returns back array of saved or error out record after validating all records on basis of ID and version keys
   *  Also does the required update operation via Promise all after creating updateMetadata
   * @static
   * @param {*} requestPayload request payload
   * @param {string} requestorProfileId
   * @param {string[]} requestPrimaryIds
   * @param {*} model
   * @param {*} modelDataResource
   * @returns
   * @memberof DAOService
   */
  public static async bulkUpdate(requestPayload, requestorProfileId: string, requestPrimaryIds: string[], model, modelDataResource) {
    log.info("In bulkUpdate() :: DAO :: DAOService Class");
    const validPrimaryIds = await DataFetch.getValidIds(model, requestPrimaryIds);
    log.info("Valid primary Ids fetched successfully :: saveRecord()");
    const result: any = { savedRecords: [], errorRecords: [] };
    // creating an all promise array which can be executed in parallel.
    const allPromise = [];
    // looping over all records to filter good vs bad records
    requestPayload.forEach((record) => {
      // Finding if given record id exists in the record ID list received via DB batch get call.
      const existingRecord = validPrimaryIds.find((validPrimaryId) => {
        return validPrimaryId.id === record.id;
      });
      if (existingRecord) {
        // If record of given id exists in database then we come in this condition.
        if (existingRecord.meta.versionId === record.meta.versionId) {
          // We proceed with creation of metadata and adding record to be saved if its version ID is correct
          record.meta = DataTransform.getUpdateMetaData(record, existingRecord.meta, requestorProfileId, false);
          record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
          const thisPromise = model
            .update(record, { where: { id: record.id } })
            .then(() => {
              result.savedRecords.push(record.dataResource);
            })
            .catch((err) => {
              log.error("Error in updating record: " + err);
              throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
            });
          allPromise.push(thisPromise);
        } else {
          // Else condition if version id is incorrect
          const badRequest = new BadRequestResult(errorCodeMap.InvalidResourceVersion.value, existingRecord.meta.versionId);
          badRequest.clientRequestId = record.meta.clientRequestId;
          result.errorRecords.push(badRequest);
        }
      } else {
        // Else condition if record sent to update doesnt exists in database
        const notFoundResult = new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
        notFoundResult.clientRequestId = record.meta.clientRequestId;
        result.errorRecords.push(notFoundResult);
      }
    });
    // promise all to run in parallel.
    log.info("Firing bulk update all promises :: bulkUpdate()");
    await Promise.all(allPromise);
    log.info("Bulk create successfull :: bulkUpdate()");
    return result;
  }

  /**
   *
   *
   * @static
   * @param {string} id
   * @param {*} recordObject
   * @param {*} serviceModel
   * @param {*} serviceDataResource
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static softDelete(id: string, recordObject: any, serviceModel: any, serviceDataResource: any): Promise<any> {
    log.info("Entering DAOService :: softDelete");
    // Default value remove. this works if onMissing is null and undefined both.
    recordObject.id = id;
    const serviceObj: any = Object.assign(new serviceModel(), recordObject);
    if (serviceDataResource) {
      serviceObj.dataResource = Object.assign(new serviceDataResource(), recordObject);
    }
    return serviceModel
      .update(serviceObj.dataValues, { where: { id } })
      .then(() => {
        log.info("Exiting DAOService :: softDelete");
        return "Resource was successfully deleted";
      })
      .catch((err) => {
        log.debug("Error while updating resource: " + err.stack);
        throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
      });
  }
}
