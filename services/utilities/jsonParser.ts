/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
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
      return searchKey
        ? searchKey.split(".").reduce((key, value) => {
            return typeof key == "undefined" || key === null ? key : key[value];
          }, record)
        : null;
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
      path ? path.split(Constants.DOT_VALUE).reduce((key, value) => (key && key[value] ? key[value] : defaultValue || null), object) : null;
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

  /**
   * Find all references in payload
   * @param {any[]} records incomming records
   * @param {string[]} [excludeElements] list of elements to be added in excludedPath for reference validation
   * @returns
   * @memberof JsonParser
   */
  public static findAllReferences(records: any, excludeElements?: string[]): any {
    log.info("Entering JsonParser :: findAllReferences()");
    excludeElements = excludeElements || [];
    const isElementPartOfExcludList = (elementPath) => {
      elementPath = elementPath.join(Constants.DOT_VALUE);
      return excludeElements.indexOf(elementPath) == -1 ? false : true;
    };
    const getReferencesMapping = (payload, referenceObj, currPath, prevPath) => {
      if (isElementPartOfExcludList(currPath)) {
        isExcluded = true;
      }
      let traversePath;
      for (const element in payload) {
        if (!payload[element]) {
          return;
        }
        if (Array.isArray(payload[element]) || typeof payload[element] === Constants.OBJECT) {
          const elementPosstion = _.isNaN(_.toNumber(element)) ? element : Constants.SQUARE_BRACKETS_OPEN + element + Constants.SQUARE_BRACKETS_CLOSE;
          prevPath = Object.assign([], currPath);
          currPath.push(elementPosstion);
          getReferencesMapping(payload[element], referenceObj, currPath, prevPath);
        }
        if (payload[element] && typeof payload[element] === Constants.TYPE_STRING) {
          if (element === Constants.REFERENCE_ATTRIBUTE) {
            const [resourceType, resourceId] = payload[element].split(Constants.FORWARD_SLASH);
            if (!referenceObj[resourceType]) {
              referenceObj[resourceType] = [];
            }
            prevPath = Object.assign([], currPath);
            currPath.push(element);
            traversePath = currPath.join(Constants.DOT_VALUE);
            const referenceObjectIndex = _.findIndex(referenceObj[resourceType], { id: resourceId });
            if (referenceObjectIndex > -1) {
              if (!isExcluded) {
                referenceObj[resourceType][referenceObjectIndex].includedPath.push(traversePath);
              } else {
                referenceObj[resourceType][referenceObjectIndex].excludedPath.push(traversePath);
              }
            } else {
              referenceObj[resourceType].push({
                id: resourceId,
                includedPath: isExcluded ? [] : [traversePath],
                excludedPath: isExcluded ? [traversePath] : []
              });
            }
            return;
          }
        } else {
          currPath = Object.assign([], prevPath);
          if (isElementPartOfExcludList(currPath)) {
            isExcluded = true;
          }
        }
      }
    };
    const currentPath = [];
    const previousPath = [];
    const referenceMapping = {};
    let isExcluded = false;
    getReferencesMapping(records, referenceMapping, currentPath, previousPath);
    log.info("Exiting JsonParser :: findAllReferences()");
    return referenceMapping;
  }
}
