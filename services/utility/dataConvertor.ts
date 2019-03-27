import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";

export class DataConvertor {
  /**
   * Parses a string safely to any untyped object. If parsing error occurs it throw an error.
   * @param {string} request
   * @returns {any}
   */
  public static safeParse(request: string): any {
    log.info("Inside Utility: safeParse()");
    try {
      return JSON.parse(request);
    } catch (err) {
      log.error("Error parsing this resource.");
      throw new BadRequestResult(errorCodeMap.InvalidRequest.value, errorCodeMap.InvalidRequest.description);
    }
  }

  /**
   *
   * @param bundle
   * @param userId
   */
  public static findValuesForKey(records: any[], searchKey: string, uniqueValuesOnly = true) {
    log.info("Inside Utility: findIds()");

    const keyValues = records.map((record) => {
      return searchKey.split(".").reduce((key, value) => {
        return typeof key == "undefined" || key === null ? key : key[value];
      }, record);
    });
    if (uniqueValuesOnly) {
      return [...new Set(keyValues)];
    }
    return keyValues;
  }

  /**
   *
   * @param bundle
   * @param userId
   */
  public static findValuesForKeys(records: any[], searchKey, uniqueValuesOnly = true) {
    log.info("Inside Utility: findIds()");

    const getValues = (obj, path, defaultValue) => path.split(".").reduce((a, c) => (a && a[c] ? a[c] : defaultValue || null), obj);

    records.forEach((record) => {
      searchKey.forEach((value, key) => {
        value.push(getValues(record, key, null));
      });
    });
    return searchKey;
  }
}
