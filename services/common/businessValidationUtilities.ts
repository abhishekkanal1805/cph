import { DataService } from "./dataService";

export class BusinessValidationUtilities {
  public static validateIfReferenceExists(serviceModel, referenceValue) {
    try {
      const result = DataService.fetchDatabaseRowStandard(referenceValue, serviceModel);
      return result;
    } catch (error) {
      // log.error("Error in fetching the record :: " + err);
      return error;
    }
  }
}
