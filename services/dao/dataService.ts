import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";

export class DataService {
  public static async fetchRowByPk(id: string, serviceModel: any): Promise<any> {
    log.info("Entering DataService :: fetchDatabaseRowStandard()");
    try {
      const results = await serviceModel.findByPk(id);
      log.info("Exiting DataService: fetchDatabaseRowStandard() :: Record retrieved successfully");
      return results.dataValues;
    } catch (err) {
      log.error("Error in fetching the record :: " + err);
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
  }

  public static async recordsCount(id: string, serviceModel: any): Promise<any> {
    log.info("Entering DataService :: fetchDatabaseRowStandard()");
    try {
      const count = await serviceModel.count({ where: { id } });
      log.info("Exiting DataService: fetchDatabaseRowStandard() :: Record retrieved successfully");
      return count;
    } catch (err) {
      log.error("Error in counting records :: " + err);
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }
  }
}
