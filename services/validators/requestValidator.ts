import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, ForbiddenResult } from "../../common/objects/custom-errors";
import { Device } from "../../models/CPH/device/device";
import { DAOService } from "../dao/daoService";

export class RequestValidator {
  /**
   * Validates the total number of records in bundle against total field.
   * Throw an error if bundle length is not same as total attribute
   * @static
   * @param {any[]} records : Record array
   * @param {number} total : Bundle's total attribute
   * @memberof RequestValidator
   */
  public static validateBundleTotal(records: any[], total: number): void {
    log.info("In RequestValidator: validateBundleTotal()");
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
   * @memberof RequestValidator
   */
  public static validateBundlePostLimit(records: any[], limit: number): void {
    log.info("In RequestValidator: validateBundlePostLimit()");
    if (records.length > limit) {
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
   * @memberof RequestValidator
   */
  public static async validateDeviceIds(deviceIds: string[]): Promise<void> {
    log.info("In RequestValidator: validateDeviceIds()");
    if (deviceIds.length > 1) {
      log.error("Number of device Ids is more than 1");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    } else if (deviceIds.length == 1) {
      const query = { where: { id: deviceIds[0] } };
      const count = await DAOService.recordsCount(query, Device);
      if (count == 0) {
        log.error("No device ID found in database for given id");
        throw new BadRequestResult(errorCodeMap.InvalidReference.value, errorCodeMap.InvalidReference.description + Constants.DEVICE_REFERENCE_KEY);
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
   * @memberof RequestValidator
   */
  public static validateUserReferenceAgainstLoggedInUser(loggedInId: string, userReferenceId: string): void {
    log.info("In RequestValidator: validateUserReferenceAgainstLoggedInUser()");
    if (loggedInId != userReferenceId) {
      log.error("Error: Logged In Id is different from user Reference Id");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }

  /**
   * Validates that number of patient references should be unique
   *
   * @static
   * @param {string[]} patientReferenceId
   * @memberof RequestValidator
   */
  public static validateUniquePatientReference(patientReferenceId: string[]): void {
    log.info("In RequestValidator: validateUniquePatientReference()");
    if (patientReferenceId.length != 1) {
      log.error("Error: Multiple or zero patient reference present in request");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }

  /**
   * Validates that number of user reference in bundle should be 1
   *
   * @static
   * @param {string[]} informationSourceIds
   * @returns {Promise<void>}
   * @memberof RequestValidator
   */
  public static validateNumberOfUniqueUserReference(informationSourceIds: string[]): void {
    log.info("In RequestValidator: validateNumberOfUniqueUserReference()");
    if (informationSourceIds.length != 1) {
      log.error("Error: Multiple user Id's found in request");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    }
  }

  /**
   *
   *
   * @static
   * @param {string[]} deviceIds device IDs array that need to be validated
   * @param {string[]} informationSourceIds informationSourceIds like information source reference array
   * @param {string[]} patientIds patientIds like subject reference array
   * @memberof RequestValidator
   */
  public static async validateDeviceAndProfile(deviceIds: string[], informationSourceIds: string[], patientIds: string[]) {
    RequestValidator.validateNumberOfUniqueUserReference(informationSourceIds);
    RequestValidator.validateUniquePatientReference(patientIds);
    await RequestValidator.validateDeviceIds(deviceIds);
  }

  public static async validateUniqueIDForPUT(primaryIds: string[], length: number) {
    log.info("In RequestValidator: validateUniqueIDForPUT()");
    if (primaryIds.length != length) {
      log.error("Error: Duplicate primary Id's found in request");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    }
  }
}
