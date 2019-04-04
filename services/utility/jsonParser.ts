import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";

export class JsonParser {
  /**
   * Safe parses incoming string to JSON format
   *
   * @static
   * @param {string} request
   * @returns {*}
   * @memberof JsonParser
   */
  public static safeParse(request: string): any {
    log.info("Inside JsonParser: safeParse()");
    try {
      return JSON.parse(request);
    } catch (err) {
      log.error("Error parsing the resource.");
      throw new BadRequestResult(errorCodeMap.InvalidRequest.value, errorCodeMap.InvalidRequest.description);
    }
  }

  /**
   * Find multiple value map against given set of search keys.
   * This function is an extentsion of findValuesForKey() where it supports multiple key search in single loop
   * @static
   * @param {any[]} records
   * @param {Map<string, any[]>} searchKey
   * @returns {Map<string, any[]>}
   * @memberof JsonParser
   */
  public static findValuesForKeyMap(records: any[], searchKeys: Map<string, any[]>): Map<string, any[]> {
    log.info("Inside JsonParser: findValuesForKeyMap()");
    const getValues = (object, path, defaultValue) =>
      path.split(Constants.DOT_VALUE).reduce((key, value) => (key && key[value] ? key[value] : defaultValue || null), object);
    records.forEach((record) => {
      searchKeys.forEach((value, key) => {
        value.push(getValues(record, key, null));
      });
    });
    return searchKeys;
  }
}
