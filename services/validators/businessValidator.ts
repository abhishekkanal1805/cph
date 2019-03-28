import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, ForbiddenResult, NotFoundResult } from "../../common/objects/custom-errors";
import { Device } from "../../models/CPH/device/device";
import { DataService } from "../common/dataService";

export class BusinessValidator {
  /**
   * Validates the total number of records in bundle against total field.
   * Throw an error if bundle length is not same as total attribute
   * @static
   * @param {any[]} records : Record array
   * @param {number} total : Bundle's total attribute
   * @memberof BusinessValidator
   */
  public static validateBundleTotal(records: any[], total: number): void {
    log.info("In BusinessValidator: validateBundleTotal()");
    if (records.length !== total) {
      log.error("Error: entries length do not match total count");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    }
  }

  /**
   *
   *
   * @static
   * @param {any[]} records : records array
   * @memberof BusinessValidator
   */
  public static validateBundlePostLimit(records: any[]): void {
    log.info("In BusinessValidator: validateBundlePostLimit()");
    if (records.length > Constants.POST_LIMIT) {
      log.error("Error: entries total count is more than allowed records");
      throw new BadRequestResult(errorCodeMap.RequestTooLarge.value, errorCodeMap.RequestTooLarge.description);
    }
  }

  /**
   * Validate that all device ID should be unique and their entry should be present in Device Table
   *
   * @static
   * @param {string[]} deviceIds
   * @returns {Promise<void>}
   * @memberof BusinessValidator
   */
  public static async validateDeviceIds(deviceIds: string[]): Promise<void> {
    log.info("In BusinessValidator: validateDeviceIds()");
    if (deviceIds.length > 1) {
      log.error("findIds() failed :: Exiting DataService :: saveRecord()");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    } else if (deviceIds.length == 1) {
      const count = await DataService.recordsCount(deviceIds[0], Device);
      if (count == 0) {
        log.error("Fetching device record failed :: Exiting DataService :: saveRecord()");
        throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
      }
    }
  }

  /**
   * Validates that ID of logged in ID should be same as user reference id coming from request
   *
   * @static
   * @param {string} loggedInId
   * @param {string} userReferenceId
   * @returns {Promise<void>}
   * @memberof BusinessValidator
   */
  public static validateUserReferenceAgainstLoggedInUser(loggedInId: string, userReferenceId: string): void {
    log.info("In BusinessValidator: validateUserReferenceAgainstLoggedInUser()");
    userReferenceId = userReferenceId.split("/")[1];
    if (loggedInId != userReferenceId) {
      log.error("Error: Logged In Id is different from user Reference Id");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }

  /**
   * Validates that number of user reference in bundle should be 1
   *
   * @static
   * @param {string[]} userIds
   * @returns {Promise<void>}
   * @memberof BusinessValidator
   */
  public static validateNumberOfUniqueUserReference(userIds: string[]): void {
    log.info("In BusinessValidator: validateNumberOfUniqueUserReference()");
    if (userIds.length != 1) {
      log.error("Error: Multiple user Id's found in request");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    }
  }
}
