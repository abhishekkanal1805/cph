import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";

export class JsonParser {
  public static safeParse(request: string): any {
    log.info("Inside Utility: safeParse()");
    try {
      return JSON.parse(request);
    } catch (err) {
      log.error("Error parsing this resource.");
      throw new BadRequestResult(errorCodeMap.InvalidRequest.value, errorCodeMap.InvalidRequest.description);
    }
  }

  public static findValuesForKey(records: any[], searchKey: string, uniqueValuesOnly: boolean = true): any[] {
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

  public static findValuesForKeyMap(records: any[], searchKey: Map<string, any[]>): Map<string, any[]> {
    log.info("Inside Utility: findIds()");
    const getValues = (object, path, defaultValue) => path.split(".").reduce((key, value) => (key && key[value] ? key[value] : defaultValue || null), object);
    records.forEach((record) => {
      searchKey.forEach((value, key) => {
        value.push(getValues(record, key, null));
      });
    });
    return searchKey;
  }
}
