/**
 * Author: Vivek Mishra, Ganesh , Vadim, Deba
 * Summary: This file contains all data validator functions
 */

import * as log from "lambda-log";
import * as lodash from "lodash";
import * as moment from "moment";
import { errorCode } from "../../common/constants/error-codes";
import * as config from "../../common/objects/config";
import { BadRequestResult, UnprocessableEntityResult } from "../../common/objects/custom-errors";
import { Utility } from "./Utility";

class DataValidatorUtility {
  public static validateStringAttributes(key, paramValue, isMultivalue) {
    // multiple value support is not there for string
    if (isMultivalue) {
      log.error("Failed for attribute: " + key + " as multivalue support is not there.");
      return false;
    }
    return true;
  }

  public static validateBooleanAttributes(key, paramValue, isMultivalue) {
    // multiple value support is not there for boolean
    if (isMultivalue) {
      log.error("Failed for attribute: " + key + " as multivalue support is not there.");
      return false;
    }
    const boolStatus = ["true", "false"].indexOf(paramValue[0].toLowerCase());
    if (boolStatus === -1) {
      log.error("Failed for attribute: " + key + " as it is not a boolean value.");
      return false;
    }
    return true;
  }

  public static validateNumberAttributes(key, paramValue, isMultivalue) {
    // multiple value support is not there for number
    if (isMultivalue) {
      log.error("Failed for attribute: " + key + " as multivalue support is not there.");
      return false;
    }
    paramValue = Utility.getPrefixDate(paramValue[0]).date;
    const numberStatus = lodash.isNaN(lodash.toNumber(paramValue));
    if (numberStatus) {
      log.error("Failed for attribute: " + key + " as it is not a number.");
      return false;
    }
    return true;
  }

  public static validateDateAttributes(key, paramValue, isMultivalue) {
    /*
      Requirements:
      1 - only for date if multiple value present then it will perform "AND" operation else "OR" operation
      2 - for other types if multiple value present it is an "OR" operation
      3 - max 2 dates are allowed for a key
      4 - both date can't have same prefix
      5 - if one date prefix is "le" then other shouldn't be "lt", same rule for ["ge", "gt"] and ["eq", "eq"]
      6 - if no prefix present we assume it is "eq"
      7 - supported prefix: ["eq", "le", "lt", "ge", "gt"], we get from prefix
    */
    const datePrefixValidMap = {
      ge: "gt",
      gt: "ge",
      le: "lt",
      lt: "le",
      eq: "eq"
    };
    if (!isMultivalue) {
      paramValue = paramValue[0].split(",");
    } else {
      DataValidatorUtility.validateMultiValueDateParams(key, paramValue);
    }
    if (paramValue.length > 2) {
      log.error("Failed for attribute: " + key + " as it contains more than 2 dates");
      return false;
    }
    let prevPrefix = "";
    for (const value of paramValue) {
      const dateObj: any = Utility.getPrefixDate(value);
      // if no prefix then it is eq
      if (!dateObj.prefix) {
        dateObj.prefix = "eq";
      }
      const isdateTime = moment(dateObj.date, "YYYY-MM-DDTHH:mm:ss.SSSSZ", true).isValid();
      const isDate = moment(dateObj.date, "YYYY-MM-DD", true).isValid();
      if (!(isdateTime || isDate)) {
        log.error("Failed for attribute: " + key + " as it is not an ISOString.");
        return false;
      }
      // error for invalid prefix
      if (config.data.validDatePrefixes.indexOf(dateObj.prefix) === -1) {
        log.error("Failed for attribute: " + key + " as it don't have valid prefix");
        return false;
      }
      // Error for point 4 & 5
      if (prevPrefix && (prevPrefix === dateObj.prefix || datePrefixValidMap[prevPrefix] === dateObj.prefix)) {
        log.error("Failed for attribute: " + key + " as both have same prefix");
        return false;
      }
      prevPrefix = dateObj.prefix;
    }
    return true;
  }

  /**
   * Receives MultiValue DateParams(i.e. dates with & in request url) and validates received values
   * @param {string} key
   * @param {string[]} paramValue
   */
  public static validateMultiValueDateParams(key: string, dateValues: string[]) {
    log.info("Inside DataValidatorUtility: validateMultiValueDateParams()");
    if (dateValues.length > 2) {
      log.error("Failed for attribute: " + key + " as it has more than two values for MultiValue Date Param");
      throw new BadRequestResult(errorCode.InvalidRequest, key + " with & cannot have more than 2 values");
    }
    if (Utility.getPrefixDate(dateValues[0]).prefix.length === 0 || Utility.getPrefixDate(dateValues[1]).prefix.length === 0) {
      log.error("Failed for attribute: " + key + " as all input dates do not have prefixes.");
      throw new UnprocessableEntityResult(errorCode.UnprocessableEntity, "All the input dates for " + key + " don't have prefixes");
    }
    if (
      Utility.getPrefixDate(dateValues[0]).prefix === Utility.getPrefixDate(dateValues[1]).prefix ||
      Utility.getPrefixDate(dateValues[0]).prefix.charAt(0) === Utility.getPrefixDate(dateValues[1]).prefix.charAt(0)
    ) {
      log.error("Failed for attribute: " + key + " as all input dates have same prefixes.");
      throw new UnprocessableEntityResult(errorCode.UnprocessableEntity, "All the input dates for " + key + " have same prefixes");
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
        log.error("Failed for attribute: " + key);
        return false;
      }
      const paramDataType = validParams[attrIdx]["type"];
      const paramValue = queryParams[key];
      if (!paramValue.length) {
        log.error("Failed for attribute: " + key);
        return false;
      }
      const isMultivalue = paramValue.length > 1;
      let validationStatus;
      switch (paramDataType) {
        case "date":
          validationStatus = DataValidatorUtility.validateDateAttributes(key, paramValue, isMultivalue);
          break;
        case "number":
          validationStatus = DataValidatorUtility.validateNumberAttributes(key, paramValue, isMultivalue);
          break;
        case "boolean":
          validationStatus = DataValidatorUtility.validateBooleanAttributes(key, paramValue, isMultivalue);
          break;
        default:
          validationStatus = DataValidatorUtility.validateStringAttributes(key, paramValue, isMultivalue);
      }
      if (!validationStatus) {
        return false;
      }
    }
    return true;
  }
}

export { DataValidatorUtility };
