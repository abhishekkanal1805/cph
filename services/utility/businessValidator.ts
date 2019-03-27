import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, NotFoundResult } from "../../common/objects/custom-errors";
import { DataSource } from "../../dataSource";
import { Device } from "../../models/CPH/device/device";
import { DataService } from "../common/dataService";

export class BusinessValidator {
  /**
   * Parses a string safely to any untyped object. If parsing error occurs it throw an error.
   * @param {string} request
   * @returns {any}
   */
  public static validateBundleTotal(record, total): any {
    log.info("Inside Utility: safeParse()");
    if (record.length !== total) {
      log.error("Error: entries length do not match total count");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    }
  }

  public static validateBundlePostLimit(record): any {
    log.info("Inside Utility: safeParse()");
    if (record.length > Constants.POST_LIMIT) {
      log.error("Error: entries total count is more than allowed records");
      throw new BadRequestResult(errorCodeMap.RequestTooLarge.value, errorCodeMap.RequestTooLarge.description);
    }
  }

  public static async validateDeviceIds(deviceIds): Promise<any> {
    log.info("Inside Utility: safeParse()");
    if (deviceIds.length > 1) {
      log.error("findIds() failed :: Exiting DataService :: saveRecord()");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    } else if (deviceIds.length == 1) {
      DataSource.addModel(Device);
      const count = await DataService.recordsCount(deviceIds[0], Device);
      if (count == 0) {
        log.error("Fetching device record failed :: Exiting DataService :: saveRecord()");
        throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
      }
    }
  }
}
