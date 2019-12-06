/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

/**
 * Author: Vivek Mishra, Ganesh , Vadim, Deba
 * Summary: This file contains all data validator functions
 */
import * as log from "lambda-log";
import * as lodash from "lodash";
import * as moment from "moment";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import * as config from "../../common/objects/config";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { Utility } from "../common/Utility";

class AggregationValidatorUtility {
  public static validateStringAttributes(key, paramValue, isMultivalue) {
    // multiple value support is not there for string
    if (isMultivalue) {
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    return true;
  }

  public static validateBooleanAttributes(key, paramValue, isMultivalue) {
    // multiple value support is not there for boolean
    if (isMultivalue) {
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    const boolStatus = ["true", "false"].indexOf(paramValue[0].toLowerCase());
    if (boolStatus === -1) {
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    return true;
  }

  public static validateNumberAttributes(key, paramValue, isMultivalue) {
    // multiple value support is not there for number
    if (isMultivalue) {
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    paramValue = Utility.getPrefixDate(paramValue[0]).date;
    const numberStatus = lodash.isNaN(lodash.toNumber(paramValue));
    if (numberStatus) {
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    return true;
  }

  public static validateDateAttributes(key, paramValue, isMultivalue) {
    /*
      Requirements:
      1 - only for date if multiple value present then it will perform "AND" operation else "OR" operation
      2 - for other types if multiple value present it is an "OR" operation
      3 - both date can't have same prefix
      4 - if one date prefix is "le" then other shouldn't be "lt", same rule for ["ge", "gt"] and ["eq", "eq"]
      5 - if no prefix present we assume it is "eq"
      6 - supported prefix: ["eq", "le", "lt", "ge", "gt"], we get from prefix
    */
    if (!isMultivalue) {
      paramValue = paramValue[0].split(",");
    } else {
      AggregationValidatorUtility.validateMultiValueDateParams(key, paramValue);
    }
    for (const value of paramValue) {
      const dateObj: any = Utility.getPrefixDate(value);
      // if no prefix then it is eq
      if (!dateObj.prefix) {
        dateObj.prefix = "eq";
      }
      const isdateTime = moment(dateObj.date, "YYYY-MM-DDTHH:mm:ss.SSSSZ", true).isValid();
      const isDate = moment(dateObj.date, "YYYY-MM-DD", true).isValid();
      const isYearMonth = moment(dateObj.date, "YYYY-MM", true).isValid();
      const isYear = moment(dateObj.date, "YYYY", true).isValid();
      if (!(isdateTime || isDate || isYearMonth || isYear)) {
        throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
      }
      // error for invalid prefix
      if (config.data.validDatePrefixes.indexOf(dateObj.prefix) === -1) {
        throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
      }
    }
    return true;
  }

  /**
   * Receives MultiValue DateParams(i.e. dates with & in request url) and validates received values
   * @param {string} key
   * @param {string[]} paramValue
   */
  public static validateMultiValueDateParams(key: string, dateValues: string[]) {
    log.info("Inside AggregationValidatorUtility: validateMultiValueDateParams()");
    if (dateValues.length > 2) {
      log.error("Failed for attribute: " + key + " as it has more than two values for MultiValue Date Param");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    if (Utility.getPrefixDate(dateValues[0]).prefix.length === 0 || Utility.getPrefixDate(dateValues[1]).prefix.length === 0) {
      log.error("Failed for attribute: " + key + " as all input dates do not have prefixes.");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    if (
      Utility.getPrefixDate(dateValues[0]).prefix === Utility.getPrefixDate(dateValues[1]).prefix ||
      Utility.getPrefixDate(dateValues[0]).prefix.charAt(0) === Utility.getPrefixDate(dateValues[1]).prefix.charAt(0)
    ) {
      log.error("Failed for attribute: " + key + " as all input dates have same prefixes.");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
  }
  /**
   * Receives queryParams and validParams and check whether all the queryParams are valid or not
   * @param {*} queryParams
   * @param {*} validParams
   * @example
   * @returns {boolean}
   */
  public static validateQueryParams(queryParams: any, validParams: any) {
    /*
      input query: url?a=1&a=2&b=1&c=3,4
      o/p from gateway event : {a: ["1", "2"], b: ["1"], c: ["3,4"]}
    */
    log.info("Inside Utility: validateQueryParams()");
    for (const key in queryParams) {
      const attrIdx = lodash.findIndex(validParams, (d: any) => d.map === key);
      if (attrIdx === -1) {
        // paramater is unsupported based on allowed config
        throw new BadRequestResult(errorCodeMap.InvalidParameter.value, errorCodeMap.InvalidParameter.description + key);
      }
      const paramDataType = validParams[attrIdx]["type"];
      const paramValue = queryParams[key];
      for (const eachValue of paramValue) {
        if (eachValue.toString().trim().length === 0) {
          throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
        }
        if (eachValue.toString().includes(",") && !validParams[attrIdx]["isMultiple"]) {
          throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
        }
      }
      const isMultivalue = paramValue.length > 1;
      let validationStatus;
      switch (paramDataType) {
        case "date":
          validationStatus = AggregationValidatorUtility.validateDateAttributes(key, paramValue, isMultivalue);
          break;
        case "number":
          validationStatus = AggregationValidatorUtility.validateNumberAttributes(key, paramValue, isMultivalue);
          break;
        case "boolean":
          validationStatus = AggregationValidatorUtility.validateBooleanAttributes(key, paramValue, isMultivalue);
          break;
        default:
          validationStatus = AggregationValidatorUtility.validateStringAttributes(key, paramValue, isMultivalue);
      }
      if (!validationStatus) {
        return false;
      }
    }
    return true;
  }
}

export { AggregationValidatorUtility };
