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
  public static validateReference<T>(requestPayload, referenceValidationModel?, referenceValidationElement?: string): Promise<{validResources: any[], errorResults: any[]}> {
    if (referenceValidationElement && referenceValidationModel) {
      log.info("Validating all references in resource.");
      const keysToFetch = new Map();
      keysToFetch.set(referenceValidationElement, []);
      const valuesMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
      log.info("Reference Keys retrieved successfully :: saveResource()");

      // uniquesReferenceIds
      let uniquesReferenceIds = [...new Set(valuesMap.get(referenceValidationElement))].filter(Boolean);
      uniquesReferenceIds = uniquesReferenceIds.map((referenceId) => {
        return referenceId.split("/")[1];
      });

      return RequestValidator.filterValidReferences(
        requestPayload,
        uniquesReferenceIds,
        referenceValidationModel,
        referenceValidationElement
      );
    } else {
      // if nothing to validate then all resources are valid
      log.info("No references to validate, returning all.");
      return Promise.resolve({validResources: requestPayload, errorResults: []});
    }

  }

}
