/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import * as sequelize from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { resourceTypeToTableNameMapping } from "../../common/objects/resourceTypeToTableNameMapping";
import { DataSource } from "../../dataSource";
import { JsonParser } from "../utilities/jsonParser";
import { RequestValidator } from "./requestValidator";

export class ReferenceValidator {
  /**
   * TODO: Handle validating multiple references
   * @param requestPayload
   * @param referenceValidationModel
   * @param {string} referenceValidationElement
   * @returns {Promise<{validResources: any[]; errorResults: any[]}>}
   */
  public static validateReference<T>(
    requestPayload,
    referenceValidationModel?,
    referenceValidationElement?: string
  ): Promise<{ validResources: any[]; errorResults: any[] }> {
    if (referenceValidationElement && referenceValidationModel) {
      log.info("Validating all references for element:" + referenceValidationElement);

      const keysMap = JsonParser.findAllKeysAsMap(requestPayload, referenceValidationElement);

      // uniquesReferenceIds
      let uniquesReferenceIds = [...new Set(keysMap.get(referenceValidationElement))].filter(Boolean);
      uniquesReferenceIds = uniquesReferenceIds.map((referenceId) => {
        return referenceId.split("/")[1];
      });
      log.info("Reference Keys validation completed for element:" + referenceValidationElement);
      // returns { validResources: any[]; errorResults: any[] }
      return RequestValidator.filterValidReferences(requestPayload, uniquesReferenceIds, referenceValidationModel, referenceValidationElement);
    } else {
      // if nothing to validate then all resources are valid
      log.debug("No references to validate, returning entire payload as valid.");
      return Promise.resolve({ validResources: requestPayload, errorResults: [] });
    }
  }

  /**
   * @param referenceMap map of resourceType and resourceIds to be validated
   * @returns
   */
  public static async validateElementsReference<T>(referenceMap: any) {
    log.info("Entering ReferenceValidator :: validateElementsReference()");
    const allPromise = [];
    for (const resourceType in referenceMap) {
      const recordIds = referenceMap[resourceType].filter((record: any) => record.includedPath.length > 0).map((value) => value.id);
      const resultPromise = ReferenceValidator.validateReferenceValue(resourceType, recordIds);
      allPromise.push(resultPromise);
    }
    // promise all to run in parallel.
    log.info("Firing bulk search query for all promises :: validateElementsReference()");
    await Promise.all(allPromise);
    log.info("Exiting ReferenceValidator :: validateElementsReference()");
  }

  /**
   * This function is used to validate relative reference irrespective of the model.
   * @param {string} resourceType which table needs to be queried
   * @param {string} resourceId which id needs to be validated
   * @param {string} [criteria] oprional search criteria
   * @returns
   */
  public static async validateReferenceValue(resourceType: string, resourceIds: string[], criteria?: string) {
    log.info("Entering ReferenceValidator :: validateReferenceValue()");
    try {
      const tableName = resourceTypeToTableNameMapping[resourceType];
      if (!tableName) {
        log.error("Error occoured in validateReferenceValue, tablename not present for resourceType: " + resourceType);
        throw new BadRequestResult(errorCodeMap.InvalidReferenceValue.value, errorCodeMap.InvalidReferenceValue.description + resourceType);
      }
      let searchQuery = `SELECT distinct(id) FROM "${tableName}" WHERE id in (:id) and CAST(("meta"#>>'{isDeleted}') AS BOOLEAN) = false`;
      const replacementValues: any = { id: resourceIds };
      if (resourceType === Constants.USER_PROFILE) {
        log.info("Validating UserProfile reference");
        replacementValues.status = Constants.ACTIVE;
        searchQuery = searchQuery + ` and status = '${Constants.ACTIVE}'`;
      }
      if (criteria) {
        searchQuery = [searchQuery, criteria].join(" ");
      }
      await DataSource.getDataSource()
        .query(searchQuery, {
          replacements: replacementValues,
          type: sequelize.QueryTypes.SELECT
        })
        .then((results) => {
          const activeRecordIds = results.map((eachRecord) => eachRecord.id);
          const invalidReferences = resourceIds.filter((recordId) => !activeRecordIds.includes(recordId));
          if (invalidReferences.length) {
            const errorMessage = invalidReferences.map((recordId) => [resourceType, recordId].join(Constants.FORWARD_SLASH));
            log.error("Error occoured in validateReferenceValue, request contains invalid reference of " + errorMessage);
            throw new BadRequestResult(errorCodeMap.InvalidReferenceValue.value, errorCodeMap.InvalidReferenceValue.description + errorMessage);
          }
        });
    } catch (err) {
      log.error("Error occoured in validateReferenceValue", err);
      throw new BadRequestResult(err.errorCode, err.description);
    }
    log.info("Exiting ReferenceValidator :: validateReferenceValue()");
  }
}
