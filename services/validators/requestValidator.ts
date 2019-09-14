import * as log from "lambda-log";
import * as sequelize from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, UnAuthorizedResult } from "../../common/objects/custom-errors";
import { resourceTypeToTableNameMapping } from "../../common/objects/resourceTypeToTableNameMapping";
import { DataSource } from "../../dataSource";
import { Device } from "../../models/CPH/device/device";
import { ResearchSubject } from "../../models/CPH/researchSubject/researchSubject";
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
   * @param {string[]} ids
   * @param {number} length
   * @returns {Promise<void>}
   */
  public static validateLength(ids: string[], length: number) {
    log.info("In RequestValidator: validateLength()");
    if (ids.length != length) {
      log.error("Error: Duplicate primary Id's found in request");
      throw new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    }
  }

  /**
   * Validates that number of user reference in bundle should be 1
   * @static
   * @param {string[]} informationSourceIds
   * @returns {Promise<void>}
   * @memberof RequestValidator
   */
  public static async validateSingularUserReference(informationSourceIds: string[]): Promise<void> {
    log.info("In RequestValidator: validateSingularUserReference()");
    let researchSubjectIds = informationSourceIds.filter((eachId: any) => {
      return eachId.indexOf(Constants.RESEARCHSUBJECT_REFERENCE) > -1;
    });
    let userProfileIds = informationSourceIds.filter((eachId: any) => {
      return eachId.indexOf(Constants.USER_PROFILE) > -1;
    });
    researchSubjectIds = [...new Set(researchSubjectIds)].map((eachId: string) => {
      return eachId.split(Constants.RESEARCHSUBJECT_REFERENCE)[1];
    });
    if (researchSubjectIds.length) {
      const researchSubjectIdsProfiles = await DataFetch.getUserProfiles(
        {
          [Constants.ID]: researchSubjectIds
        },
        ResearchSubject
      );
      userProfileIds = userProfileIds.concat(
        researchSubjectIdsProfiles.map((record: any) => {
          return record[Constants.INDIVIDUAL][Constants.REFERENCE_ATTRIBUTE];
        })
      );
    }
    return RequestValidator.validateLength([...new Set(userProfileIds)], 1);
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
    await RequestValidator.validateSingularUserReference(informationSourceIds);
    await RequestValidator.validateSingularUserReference(patientIds);
    await RequestValidator.validateDeviceIds(deviceIds);
  }

  /**
   * This function is used to validate relative reference irrespective of the model.
   * @param {string} resourceType which table needs to be queried
   * @param {string} resourceId which id needs to be validated
   * @returns {Promise<boolean>} returns true if validated else false
   */
  public static async validateReference(resourceType: string, resourceIds: string[]) {
    log.info("In RequestValidator: validateReference()");
    try {
      const tableName = resourceTypeToTableNameMapping[resourceType];
      if (tableName) {
        if (resourceType === Constants.USER_PROFILE) {
          // validate UserProfile resourceType
          log.info("Validating UserProfile resource");
          const result = await DataFetch.getValidUserProfileIds(resourceIds);
          if (result.length < 1) {
            log.error("Invalid UserProfile resourceType reference");
            throw Error();
          }
        } else {
          await DataSource.getDataSource()
            .query('SELECT count(*) FROM "' + tableName + '" WHERE id in (:id) and ' + "cast(\"dataResource\" -> 'meta' ->> 'isDeleted' as text) = 'false';", {
              replacements: { id: resourceIds },
              type: sequelize.QueryTypes.SELECT
            })
            .then((results) => {
              if (results[0].count != [...new Set(resourceIds)].length) {
                throw new UnAuthorizedResult(errorCodeMap.InvalidReference.value, errorCodeMap.InvalidReference.description);
              }
            });
        }
      } else {
        throw Error();
      }
    } catch (err) {
      throw new UnAuthorizedResult(errorCodeMap.InvalidReference.value, errorCodeMap.InvalidReference.description);
    }
  }

  /**
   * Validates and filters resource references.
   * @param requestPayload
   * @param uniqueReferenceIds
   * @param referenceModel
   * @return {Promise<{validResources: any[]; errorResults: any[]}>}
   */
  public static async filterValidReferences(requestPayload, uniqueReferenceIds, referenceModel, referenceValidationAttribute: string) {
    log.info("filterValidReferences for referenceValidationAttribute=" + referenceValidationAttribute);
    const response = { validResources: [], errorResults: [] };
    const recordArr = [];
    const results: any = await DataFetch.getValidIds(referenceModel, uniqueReferenceIds);
    const validReferenceIds: string[] = Utility.findIds(results, Constants.ID).map((eachId) => eachId);
    if (uniqueReferenceIds.length !== validReferenceIds.length) {
      for (const resource of requestPayload) {
        if (
          resource.hasOwnProperty(referenceValidationAttribute.split(Constants.DOT_VALUE)[0]) &&
          !validReferenceIds.includes(resource[referenceValidationAttribute.split(Constants.DOT_VALUE)[0]].reference.split(Constants.FORWARD_SLASH)[1])
        ) {
          const badRequestError = new BadRequestResult(
            errorCodeMap.InvalidReference.value,
            errorCodeMap.InvalidReference.description + referenceValidationAttribute.split(Constants.DOT_VALUE)[0]
          );
          if (resource.meta && resource.meta.clientRequestId) {
            badRequestError.clientRequestId = resource.meta.clientRequestId;
          }
          response.errorResults.push(badRequestError);
        } else {
          recordArr.push(resource);
        }
      }
      response.validResources = recordArr;
    } else {
      response.validResources = requestPayload;
      response.errorResults = [];
    }
    log.info("Completed filterValidReferences for referenceValidationAttribute=" + referenceValidationAttribute);
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
