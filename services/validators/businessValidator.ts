import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, ForbiddenResult, NotFoundResult } from "../../common/objects/custom-errors";
import { DataSource } from "../../dataSource";
import { Device } from "../../models/CPH/device/device";
import { DataService } from "../common/dataService";

export class BusinessValidator {
  public static validateBundleTotal(record: any[], total: number): void {
    log.info("Inside Utility: safeParse()");
    if (record.length !== total) {
      log.error("Error: entries length do not match total count");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    }
  }

  public static validateBundlePostLimit(record: any[]): void {
    log.info("Inside Utility: safeParse()");
    if (record.length > Constants.POST_LIMIT) {
      log.error("Error: entries total count is more than allowed records");
      throw new BadRequestResult(errorCodeMap.RequestTooLarge.value, errorCodeMap.RequestTooLarge.description);
    }
  }

  public static async validateDeviceIds(deviceIds: string[]): Promise<void> {
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

  public static async validateUserReferenceAgainstLoggedInUser(loggedInId: string, userReferenceId: string): Promise<void> {
    log.info("Inside Utility: safeParse()");
    userReferenceId = userReferenceId.split("/")[1];
    if (loggedInId != userReferenceId) {
      log.error("Error: entries total count is more than allowed records");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }

  public static async validateNumberOfUniqueUserReference(userIds: string[]): Promise<void> {
    log.info("Inside Utility: safeParse()");
    if (userIds.length != 1) {
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    }
  }
}
