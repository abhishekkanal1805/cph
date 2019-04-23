import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";

export class DAOService {
  /**
   * Fetch database record by its primary key
   *
   * @static
   * @param {string} id : primary key id
   * @param {*} model : sequelize model
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async fetchRowByPk(id: string, model: any): Promise<any> {
    log.info("Entering DAOService :: fetchRowByPk()");
    try {
      const results = await model.findByPk(id);
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
   * @param {*} model
   * @param {*} options
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async fetchRowByPkQuery(id: string, model: any, options: any): Promise<any> {
    log.info("Entering DAOService :: fetchRowByPkQuery()");
    try {
      const results = await model.findByPk(id, options);
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
   * @param {*} model
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async recordsCount(query, model: any): Promise<any> {
    log.info("Entering DAOService :: recordsCount()");
    try {
      const count = await model.count(query);
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
   * @param {*} model
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async bulkSave(records, model: any): Promise<any> {
    log.info("Entering DAOService :: bulkSave()");
    try {
      await model.bulkCreate(records);
      log.debug("Resource saved ");
    } catch (err) {
      log.error("Error while saving Record: " + err.stack);
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }
  }

  /**
   * Update record for given Model
   * @param model
   * @param record
   * @param updatedResources
   * @return {Promise<any>}
   */
  public static async update(model, record, updatedResources) {
    return model
      .update(record, { where: { id: record.id } })
      .then(() => {
        updatedResources.savedRecords.push(record.dataResource);
      })
      .catch((err) => {
        log.error("Error in updating record: " + err);
        throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
      });
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
   * @param {*} model
   * @returns {Promise<object>}
   * @memberof DAOService
   */
  public static delete(id: string, model: any): Promise<object> {
    log.info("Entering DAOService :: delete");
    return model
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
   * Deletes resources as per the provided criteria.
   * @param criteria
   * @param model
   * @return {Promise<object>}
   */
  public static deleteWithCriteria(criteria, model: any): Promise<object> {
    log.info("Entering DAOService :: deleteWithCriteria");
    return model
      .destroy({ where: criteria })
      .then((rowsDeleted: any) => {
        log.info("Exiting DAOService: deleteWithCriteria() :: Record deleted successfully");
        return rowsDeleted;
      })
      .catch((err) => {
        log.error("Error in delete the record :: " + err.stack);
        throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
      });
  }

  /**
   *
   * @static
   * @param {string} id
   * @param {*} record
   * @param {*} model
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static softDelete(id: string, record: any, model): Promise<any> {
    log.info("Entering DAOService :: softDelete");
    // Default value remove. this works if onMissing is null and undefined both.
    return model
      .update(record.dataValues, { where: { id } })
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
