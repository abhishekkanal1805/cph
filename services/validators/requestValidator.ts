import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, ForbiddenResult } from "../../common/objects/custom-errors";
import { Device } from "../../models/CPH/device/device";
import { Utility } from "../common/Utility";
import { DAOService } from "../dao/daoService";
import { DataFetch } from "../utilities/dataFetch";

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

  /**
   * Validates and filters resource references.
   * @param requestPayload
   * @param uniqueReferenceIds
   * @param referenceModel
   * @return {Promise<{validResources: any[]; errorResults: any[]}>}
   */
  public static async filterValidReferences(requestPayload, uniqueReferenceIds, referenceModel) {
    log.info("In RequestValidator: filterValidReferences()");
    const response = { validResources: [], errorResults: [] };
    const recordArr = [];
    const results: any = await DataFetch.getValidIds(referenceModel, uniqueReferenceIds);
    const validMedicationPlanIds: string[] = Utility.findIds(results, "id").map((eachId) => eachId);
    if (uniqueReferenceIds.length !== validMedicationPlanIds.length) {
      for (const medicationActivity of requestPayload) {
        if (
          medicationActivity.hasOwnProperty("medicationPlan") &&
          !validMedicationPlanIds.includes(medicationActivity.medicationPlan.reference.split("/")[1])
        ) {
          const badRequest = new BadRequestResult(errorCodeMap.InvalidReference.value, errorCodeMap.InvalidReference.description + "MedicationPlan");
          if (medicationActivity.meta && medicationActivity.meta.clientRequestId) {
            badRequest.clientRequestId = medicationActivity.meta.clientRequestId;
          }
          response.errorResults.push(badRequest);
        } else {
          recordArr.push(medicationActivity);
        }
      }
      response.validResources = recordArr;
    } else {
      response.validResources = requestPayload;
      response.errorResults = [];
    }
    log.info("In RequestValidator: filterValidReferences()");
    return response;
  }

  /**
   * Processes and validates the request payload.
   * @param requestPayload
   * @return {requestPayload}
   */
  public static processAndValidateRequestPayload(requestPayload) {
    if (!Array.isArray(requestPayload.entry)) {
      requestPayload = [requestPayload];
    } else {
      const total = requestPayload.total;
      requestPayload = requestPayload.entry.map((entry) => entry.resource);
      RequestValidator.validateBundleTotal(requestPayload, total);
      RequestValidator.validateBundlePostLimit(requestPayload, Constants.POST_LIMIT);
    }
    return requestPayload;
  }
}
