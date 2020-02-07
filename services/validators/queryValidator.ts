/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import * as moment from "moment";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { Utility } from "../common/Utility";

export class QueryValidator {
  /**
   * This Function validates whether the input prefix is valid or not
   * It will return true if prefix is valid else false
   * @static
   * @param {string} inputPrefix Input prefix from attribute like ge/le/gt/lt/eq
   * @returns {boolean}
   * @memberof QueryValidator
   */
  public static validatePrefix(inputPrefix: string): boolean {
    switch (inputPrefix) {
      case Constants.PREFIX_GREATER_THAN:
      case Constants.PREFIX_GREATER_THAN_EQUAL:
      case Constants.PREFIX_LESS_THAN:
      case Constants.PREFIX_LESS_THAN_EQUAL:
      case Constants.PREFIX_EQUAL:
        return true;
      default:
        return false;
    }
  }

  /**
   * It will validate input value for boolean data type
   * @static
   * @param {string} key Attribute name in query parameter
   * @param {string[]} paramValue Attribute value in query parameter
   * @param {boolean} isMultivalue Flag to check if attribute contains multiple value for AND operation
   * @memberof QueryValidator
   */
  public static validateBooleanAttributes(key: string, paramValue: string[], isMultivalue: boolean) {
    if (isMultivalue) {
      log.error("Boolean dateType doesn't support multiple value search with AND operation");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    const boolStatus = ["true", "false"].indexOf(paramValue[0].toLowerCase());
    if (boolStatus === -1) {
      log.error("Input value is not type of Boolean, value: " + paramValue[0]);
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
  }

  /**
   * It will validate input value for Number data type
   * @static
   * @param {string} key Attribute name in query parameter
   * @param {string[]} paramValue Attribute value in query parameter
   * @param {boolean} isMultivalue Flag to check if attribute contains multiple value for AND operation
   * @memberof QueryValidator
   */
  public static validateNumberAttributes(key: string, paramValue: string[], isMultivalue: boolean) {
    // multiple value support is not there for number
    if (isMultivalue) {
      log.error("Number dateType doesn't support multiple value search with AND operation");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    const value = Utility.getSearchPrefixValue(paramValue[0]).data;
    const numberStatus = _.isNaN(_.toNumber(value));
    if (numberStatus) {
      log.error("Input value is not type of Number, value: " + value);
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    return true;
  }

  /**
   * It will validate input value for Date data type
   * @static
   * @param {string} key Attribute name in query parameter
   * @param {string[]} paramValue Attribute value in query parameter
   * @param {boolean} isMultivalue Flag to check if attribute contains multiple value for AND operation
   * @memberof QueryValidator
   */
  public static validateDateAttributes(key: string, paramValue: string[], isMultivalue: boolean) {
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
      paramValue = paramValue[0].split(Constants.COMMA_VALUE);
    } else {
      this.validateMultiValuePrefixParams(key, paramValue);
    }
    for (const value of paramValue) {
      const dateObject = Utility.getSearchPrefixValue(value);
      // if no prefix then it is eq
      if (!dateObject.prefix) {
        dateObject.prefix = Constants.PREFIX_EQUAL;
      }
      const isDateTimeWithoutTimezone = moment(dateObject.data, Constants.DATE_TIME_ONLY, true).isValid();
      const isDateTime = moment(dateObject.data, Constants.DATE_TIME, true).isValid();
      const isDate = moment(dateObject.data, Constants.DATE, true).isValid();
      const isYearMonth = moment(dateObject.data, Constants.YEAR_MONTH, true).isValid();
      const isYear = moment(dateObject.data, Constants.YEAR, true).isValid();
      if (!(isDateTimeWithoutTimezone || isDateTime || isDate || isYearMonth || isYear)) {
        log.error("Input value date format is not valid");
        throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
      }
      const isPrefixValid = this.validatePrefix(dateObject.prefix);
      if (!isPrefixValid) {
        log.error("prefix present in input is not valid. prefix: " + dateObject.prefix);
        throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
      }
    }
    return true;
  }

  /**
   * Receives MultiValue DateParams(i.e. dates with & in request url) and validates received values
   * @static
   * @param {string} key Attribute name in query parameter
   * @param {string[]} dataValues Attribute value in query parameter
   * @memberof QueryValidator
   */
  public static validateMultiValuePrefixParams(key: string, dataValues: string[]) {
    log.info("Inside DataValidatorUtility: validateMultiValuePrefixParams()");
    if (dataValues.length != 2) {
      // In case of date range or number range we expect 2 values
      log.error("Failed for attribute: " + key + " as it has more than two values");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    const firstParameterPrefix = Utility.getSearchPrefixValue(dataValues[0]).prefix;
    const secondParameterPrefix = Utility.getSearchPrefixValue(dataValues[1]).prefix;
    if (firstParameterPrefix.length === 0 || secondParameterPrefix.length === 0) {
      log.error("Failed for attribute: " + key + " as all input dates do not have prefixes.");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
    if (firstParameterPrefix === secondParameterPrefix || firstParameterPrefix.charAt(0) === secondParameterPrefix.charAt(0)) {
      log.error("Failed for attribute: " + key + " as all input dates have same prefixes.");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
    }
  }
  /**
   * Performs validation on input query parameter
   * @static
   * @param {*} queryParams Input search request
   * @param {*} attributesMapping Column mapping for queryParams
   * @memberof QueryValidator
   */
  public static validateQueryParams(queryParams: any, attributesMapping: any) {
    /*
      input query: url?a=1&a=2&b=1&c=3,4
      o/p from gateway event : {a: ["1", "2"], b: ["1"], c: ["3,4"]}
    */
    log.info("Inside Utility: validateQueryParams()");
    for (const key in queryParams) {
      const attributeObj = attributesMapping[key];
      if (!attributeObj) {
        log.error("Entry doesn't exists in config file for key: " + key);
        throw new BadRequestResult(errorCodeMap.InvalidParameter.value, errorCodeMap.InvalidParameter.description + key);
      }
      const paramDataType = attributeObj[Constants.ATTRIBUTE_DATA_TYPE];
      const paramValue = queryParams[key];
      const isMultivalue = paramValue.length > 1;
      for (const eachValue of paramValue) {
        if (eachValue.length === 0) {
          log.error("parameter value is empty for key: " + key);
          throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
        }
        if (eachValue.toString().includes(Constants.COMMA_VALUE) && !attributeObj[Constants.ATTRIBUTE_IS_MULTIPLE]) {
          log.error("multiple values present for key: " + key);
          throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
        }
      }
      switch (paramDataType) {
        case Constants.TYPE_DATE:
          this.validateDateAttributes(key, paramValue, isMultivalue);
          break;
        case Constants.TYPE_NUMBER:
          this.validateNumberAttributes(key, paramValue, isMultivalue);
          break;
        case Constants.TYPE_BOOLEAN:
          this.validateBooleanAttributes(key, paramValue, isMultivalue);
          break;
        default:
          // default type is string
          if (isMultivalue) {
            log.error("String dateType doesn't support multiple value search with AND operation");
            throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + key);
          }
      }
    }
  }
}
