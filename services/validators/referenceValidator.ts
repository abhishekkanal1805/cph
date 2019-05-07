import * as log from "lambda-log";
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

      return RequestValidator.filterValidReferences(requestPayload, uniquesReferenceIds, referenceValidationModel, referenceValidationElement);
      log.info("Reference Keys validation completed for element:" + referenceValidationElement);
    } else {
      // if nothing to validate then all resources are valid
      log.debug("No references to validate, returning entire payload as valid.");
      return Promise.resolve({ validResources: requestPayload, errorResults: [] });
    }
  }
}
