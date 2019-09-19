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
   * Find all values against searchkey passed in request.
   *
   * @static
   * @param {any[]} records : array of records where search key need to be search. e.g. {a:1,b:{c:2}}
   * @param {string} searchKey : string formatted search key in format of "b.c"
   * @param {boolean} [uniqueValuesOnly=true] : setting it to true only returns unique key values
   * @returns {any[]}
   * @memberof JsonParser
   */
  public static findValuesForKey(records: any[], searchKey: string, uniqueValuesOnly: boolean = true): any[] {
    log.info("Inside JsonParser: findValuesForKey()");
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
   * @deprecated use findAllKeysAsMap
   * Find multiple value map against given set of search keys.
   * This function is an extentsion of findValuesForKey() where it supports multiple key search in single loop
   * @static
   * @param {any[]} records
   * @param {Map<string, any[]>} searchKeys the Array size will be the same as the size of records passed.
   * TODO: If not all records match the keypath, values filled will be null. See unit test for behavior. Is this something we need to fix?
   * TODO: Only keys to be searched should be provided, and the Map should be constructed internally. see findAllKeysAsMap
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

  /**
   * Variation of the findValuesForKeyMap where the search key maps is initialized
   * @param {any[]} records
   * @param {string} keys
   * @returns {Map<string, any[]>}
   */
  public static findAllKeysAsMap(records: any[], ...keys: string[]): Map<string, any[]> {
    const keysToFetch = new Map();
    for (const key of keys) {
      if (key) {
      keysToFetch.set(key, []);
      }
    }
    return JsonParser.findValuesForKeyMap(records, keysToFetch);
  }
}
