import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";

export class DataService {
  /**
   * Fetch database record by its primary key
   *
   * @static
   * @param {string} id : primary key id
   * @param {*} serviceModel : sequelize model
   * @returns {Promise<any>}
   * @memberof DataService
   */
  public static async fetchRowByPk(id: string, serviceModel: any): Promise<any> {
    log.info("Entering DataService :: fetchRowByPk()");
    try {
      const results = await serviceModel.findByPk(id);
      return results.dataValues;
    } catch (err) {
      log.error("fetchRowByPk() :: Error in fetching the record :: " + err);
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
   * @memberof DataService
   */
  public static async recordsCount(id: string, serviceModel: any): Promise<any> {
    log.info("Entering DataService :: recordsCount()");
    try {
      const count = await serviceModel.count({ where: { id } });
      return count;
    } catch (err) {
      log.error("recordsCount() :: Error in counting records :: " + err);
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }
  }
}
