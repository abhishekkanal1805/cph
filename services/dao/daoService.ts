import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";

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
  public static async fetchByPk(id: string, model: any): Promise<any> {
    log.info("Entering DAOService :: fetchByPk()");
    try {
      const results = await model.findByPk(id);
      if (results) {
        return results.dataValues;
      }
    } catch (err) {
      log.error("fetchByPk() :: Error in fetching record for [" + model.name + "] for id=" + id + ". Message" + err.stack, err);
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }

    // it will come here if results were null
    log.info("fetchByPk() :: No records found for [" + model.name + "] for id=" + id);
    // TODO: Review if record not found should be error state. Its here to prevent refactoring of calling functions
    throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
  }

  /**
   * Executes findOne on the Sequelize Model with the provided options.
   * Depending on the options more rows can exits in the DB but we limit the fetch to one row.
   *
   * @static
   * @param {string} id
   * @param {*} model
   * @param {*} options
   * @returns {Promise<any>}
   * @memberof DAOService
   */
  public static async fetchOne(model: any, options: any): Promise<any> {
    log.info("Entering DAOService :: fetchOne()");
    try {
      const results = await model.findOne(options);
      if (results) {
        return results.dataValues;
      }
    } catch (err) {
      log.error("fetchOne() :: Error in fetching record for [" + model.name + "]. Message" + err.stack, err);
      if (err.name === Constants.SEQUELIZE_DATABASE_ERROR) {
        throw new BadRequestResult(errorCodeMap.QueryGenerationFailed.value, errorCodeMap.QueryGenerationFailed.description);
      }
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }

    // it will come here if results were null
    log.info("fetchOne() :: No records found for [" + model.name + "].");
    // TODO: Review if record not found should be error state. Its here to prevent refactoring of calling functions
    throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
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
   * A generic update record the can be used for any Model. A blind update will be attempted.
   * If successful it returns the updated resource and all exceptions are thrown
   * @param model
   * @param record
   * @return {Promise<any>} return the update record
   */
  public static async update(model, record) {
    try {
      return await model.update(record, { returning: true, where: { id: record.id } }).then(([rowsUpdated, [updatedRow]]) => {
        log.info("Update completed for [" + model.name + "] with id=" + record.id + ". rowsUpdated=" + rowsUpdated);
        // QUESTION: should we return only dataResource instead of whole record and let the caller determine what to extract?
        return updatedRow.dataResource;
      });
    } catch (err) {
      log.error("Error in updating record: " + err);
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
      log.error("Error while searching records: " + err.stack);
      if (err.name === Constants.SEQUELIZE_DATABASE_ERROR) {
        throw new BadRequestResult(errorCodeMap.QueryGenerationFailed.value, errorCodeMap.QueryGenerationFailed.description);
      }
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
