/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import * as moment from "moment";
import { unitOfTime } from "moment";
import { literal, Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { Utility } from "../common/Utility";

class QueryGenerator {
  /**
   * It return sequlize operator for a prefix
   *
   * @static
   * @param {string} operation Prefix attibute like ge/le/gt/lt/eq
   * @returns
   * @memberof QueryGenerator
   */
  public static getOperator(operation: string) {
    const operatorMap = {
      like: Op.iLike,
      startsWith: Op.iLike,
      endsWith: Op.iLike,
      ge: Op.gte,
      le: Op.lte,
      gt: Op.gt,
      lt: Op.lt,
      eq: Op.eq,
      ne: Op.ne
    };
    return operatorMap[operation] || Op.eq;
  }
  /**
   * It return symbol for a prefix
   *
   * @static
   * @param {string} operation Prefix attibute like ge/le/gt/lt/eq
   * @returns
   * @memberof QueryGenerator
   */
  public static getNumericSymbol(operation: string) {
    const operatorMap = {
      ge: Constants.GREATER_THAN_EQUAL,
      le: Constants.LESS_THAN_EQUAL,
      gt: Constants.GREATER_THAN,
      lt: Constants.LESS_THAN,
      eq: Constants.EQUAL,
      ne: Constants.NOT_EQUAL_OPERATOR
    };
    return operatorMap[operation] || Constants.EQUAL;
  }

  /**
   * It will add wild card charecter for like/ilike operation
   * For raw query it will add \" in input value to perform like operation
   * @static
   * @param {string} value Input value of search attribute
   * @param {*} column Column object from config file
   * @param {boolean} [isRawQuery] Boolean flag for raw query
   * @returns
   * @memberof QueryGenerator
   */
  public static getUpdatedSearchValue(value: string, column: any, isRawQuery?: boolean) {
    const prefixValue = column.prefix || Constants.EMPTY_VALUE;
    const suffixValue = column.suffix || Constants.EMPTY_VALUE;
    const quoteValue = isRawQuery ? Constants.DOUBLE_QUOTE : Constants.EMPTY_VALUE;
    if (column.cast === Constants.TYPE_NUMBER) {
      return Number(value) || 0;
    }
    // Add prefix if value doesn't contain any reference
    if (value.indexOf(Constants.FORWARD_SLASH) == -1) {
      value = [prefixValue, value, suffixValue].join(Constants.EMPTY_VALUE);
    }
    switch (column.operation) {
      case Constants.OPERATION_LIKE:
        value = Constants.PERCENTAGE_VALUE + value + Constants.PERCENTAGE_VALUE;
        break;
      case Constants.OPERATION_STARTS_WITH:
        value = quoteValue + value + Constants.PERCENTAGE_VALUE;
        break;
      case Constants.OPERATION_ENDS_WITH:
        value = Constants.PERCENTAGE_VALUE + value + quoteValue;
        break;
      case Constants.OPERATION_WORD_MATCH:
        value = isRawQuery ? Constants.POSIX_START + value + Constants.POSIX_END : value;
        break;
      default:
        value = quoteValue + value + quoteValue;
    }
    return value;
  }

  /**
   * It will add additional filter for Period
   * FHIR Date Search: https://www.hl7.org/fhir/search.html#date
   * If input is 2019-03-12T07:32:18.279Z, then as per FHIR it should match for 2019, 2019-03, 2019-03-12
   * if dateObject is of type datetime then add condition for data, year-month, year
   * if dateObject is of type date then add condition for year-month, year
   * if dateObject is of type year-month then add condition for year
   * if dateObject is of type year then don't add any condition
   * @static
   * @param {string} columnName Column object from config file
   * @param {*} rangeObject RangeObject object from config file, it will specify start and end attribute for a column
   * @param {*} dateMomentObject Input Date object
   * @param {*} queryObject Query object which stores all search conditions
   * @param {string} prefix prefix value of input search value
   * @param {string} currentDatePattern Date pattern of input dateObject
   * @memberof QueryGenerator
   */

  public static getAddtionalPeriodDateFilters(columnName, dateMomentObject, periodAttribute, queryObject, currentDatePattern) {
    if (!queryObject[Op.or]) {
      queryObject[Op.or] = [];
    }
    const periodDate = dateMomentObject.format(Constants.DATE);
    const periodYearMonth = dateMomentObject.format(Constants.YEAR_MONTH);
    const periodYear = dateMomentObject.format(Constants.YEAR);
    switch (currentDatePattern) {
      case Constants.DATE_TIME:
        queryObject[Op.or].push({
          [columnName]: {
            [periodAttribute]: periodDate
          }
        });
      case Constants.DATE:
        queryObject[Op.or].push({
          [columnName]: {
            [periodAttribute]: periodYearMonth
          }
        });
      case Constants.YEAR_MONTH:
        queryObject[Op.or].push({
          [columnName]: {
            [periodAttribute]: periodYear
          }
        });
      default:
        break;
    }
  }

  /**
   * It will add additional filter for Period
   * FHIR Date Search: https://www.hl7.org/fhir/search.html#date
   * If input is 2019-03-12T07:32:18.279Z, then as per FHIR it should match for 2019, 2019-03, 2019-03-12
   * if dateObject is of type datetime then add condition for data, year-month, year
   * if dateObject is of type date then add condition for year-month, year
   * if dateObject is of type year-month then add condition for year
   * if dateObject is of type year then don't add any condition
   * @static
   * @param {string} columnName Column object from config file
   * @param {*} rangeObject RangeObject object from config file, it will specify start and end attribute for a column
   * @param {*} dateMomentObject Input Date object
   * @param {*} queryObject Query object which stores all search conditions
   * @param {string} currentDatePattern Date pattern of input dateObject
   * @param {string} prefix prefix value of input search value
   * @memberof QueryGenerator
   */
  public static getPeriodDateTimeFilters(
    columnName: string,
    rangeObject: any,
    dateMomentObject: any,
    queryObject: any,
    currentDatePattern: string,
    prefix: string,
    condtionOperator: symbol
  ) {
    if (!queryObject[condtionOperator]) {
      queryObject[condtionOperator] = [];
    }
    const operator = this.getOperator(prefix);
    const startOperator = this.getOperator(Constants.PREFIX_LESS_THAN_EQUAL);
    const endOperator = this.getOperator(Constants.PREFIX_GREATER_THAN_EQUAL);
    let periodAttribute = rangeObject.end;
    switch (prefix) {
      case Constants.PREFIX_GREATER_THAN:
      case Constants.PREFIX_GREATER_THAN_EQUAL:
        queryObject[condtionOperator].push({
          [columnName]: {
            [periodAttribute]: {
              [operator]: dateMomentObject.toISOString()
            }
          }
        });
        this.getAddtionalPeriodDateFilters(columnName, dateMomentObject, periodAttribute, queryObject, currentDatePattern);
        break;
      case Constants.PREFIX_LESS_THAN:
      case Constants.PREFIX_LESS_THAN_EQUAL:
        periodAttribute = rangeObject.start;
        queryObject[condtionOperator].push({
          [columnName]: {
            [periodAttribute]: {
              [operator]: dateMomentObject.toISOString()
            }
          }
        });
        this.getAddtionalPeriodDateFilters(columnName, dateMomentObject, periodAttribute, queryObject, currentDatePattern);
        break;
      default:
        queryObject[condtionOperator].push({
          [columnName]: {
            [rangeObject.start]: {
              [startOperator]: dateMomentObject.toISOString()
            },
            [rangeObject.end]: {
              [endOperator]: dateMomentObject.toISOString()
            }
          }
        });
        this.getAddtionalPeriodDateFilters(columnName, dateMomentObject, periodAttribute, queryObject, currentDatePattern);
    }
  }

  /**
   * It will add additional filter for Period
   * FHIR Date Search: https://www.hl7.org/fhir/search.html#date
   * If input is 2019-03-12T07:32:18.279Z, then as per FHIR it should match for 2019, 2019-03, 2019-03-12
   * if dateObject is of type datetime then add condition for data, year-month, year
   * if dateObject is of type date then add condition for year-month, year
   * if dateObject is of type year-month then add condition for year
   * if dateObject is of type year then don't add any condition
   * @static
   * @param {string} columnName Column object from config file
   * @param {*} rangeObject RangeObject object from config file, it will specify start and end attribute for a column
   * @param {*} dateMomentObject Input Date object
   * @param {*} queryObject Query object which stores all search conditions
   * @param {string} currentDatePattern Date pattern of input dateObject
   * @param {string} prefix prefix value of input search value
   * @memberof QueryGenerator
   */
  public static getPeriodDateFilters(
    columnName: string,
    rangeObject: any,
    dateMomentObject: any,
    queryObject: any,
    currentDatePattern: string,
    prefix: string,
    condtionOperator: symbol
  ) {
    if (!queryObject[condtionOperator]) {
      queryObject[condtionOperator] = [];
    }
    const operatorMapping = {
      [Constants.PREFIX_GREATER_THAN]: Constants.PREFIX_GREATER_THAN_EQUAL,
      [Constants.PREFIX_LESS_THAN_EQUAL]: Constants.PREFIX_LESS_THAN
    };
    const newPrefix = operatorMapping[prefix] ? operatorMapping[prefix] : prefix;
    const operator = this.getOperator(newPrefix);
    const startOperator = this.getOperator(Constants.PREFIX_LESS_THAN_EQUAL);
    const endOperator = this.getOperator(Constants.PREFIX_GREATER_THAN);
    let periodAttribute = rangeObject.end;
    let periods: unitOfTime.StartOf = Constants.PERIOD_DAYS;
    if (currentDatePattern === Constants.YEAR_MONTH) {
      periods = Constants.PERIOD_MONTHS;
    } else if (currentDatePattern === Constants.YEAR) {
      periods = Constants.PERIOD_YEARS;
    }
    if (prefix === Constants.PREFIX_LESS_THAN_EQUAL || prefix === Constants.PREFIX_LESS_THAN) {
      periodAttribute = rangeObject.start;
    }
    const nextDate = moment(dateMomentObject)
      .add({ [periods]: 1 })
      .format(currentDatePattern);
    switch (prefix) {
      case Constants.PREFIX_GREATER_THAN:
      case Constants.PREFIX_LESS_THAN_EQUAL:
        queryObject[condtionOperator].push({
          [columnName]: {
            [periodAttribute]: {
              [operator]: nextDate
            }
          }
        });
        this.getAddtionalPeriodDateFilters(columnName, dateMomentObject, periodAttribute, queryObject, currentDatePattern);
        break;
      case Constants.PREFIX_GREATER_THAN_EQUAL:
      case Constants.PREFIX_LESS_THAN:
        queryObject[condtionOperator].push({
          [columnName]: {
            [periodAttribute]: {
              [operator]: dateMomentObject.format(currentDatePattern)
            }
          }
        });
        this.getAddtionalPeriodDateFilters(columnName, dateMomentObject, periodAttribute, queryObject, currentDatePattern);
        break;
      default:
        const utcOffset = dateMomentObject.utcOffset();
        const startDate = moment(dateMomentObject, currentDatePattern)
          .utc(utcOffset)
          .add(-1, periods)
          .endOf(Constants.PERIOD_DAYS)
          .toISOString();
        const endDate = moment(dateMomentObject, currentDatePattern)
          .utc(utcOffset)
          .endOf(Constants.PERIOD_DAYS)
          .toISOString();
        queryObject[condtionOperator].push({
          [columnName]: {
            [rangeObject.start]: {
              [startOperator]: endDate
            },
            [rangeObject.end]: {
              [endOperator]: startDate
            }
          }
        });
        this.getAddtionalPeriodDateFilters(columnName, dateMomentObject, periodAttribute, queryObject, currentDatePattern);
    }
  }

  /**
   * It will add additional filter for input Date value
   * FHIR Date Search: https://www.hl7.org/fhir/search.html#date
   * If input is 2019-03-12T07:32:18.279Z, then as per FHIR it should match for 2019, 2019-03, 2019-03-12
   * if dateObject is of type datetime then add condition for data, year-month, year
   * if dateObject is of type date then add condition for year-month, year
   * if dateObject is of type year-month then add condition for year
   * if dateObject is of type year then don't add any condition
   * @static
   * @param {string} columnName Column object from config file
   * @param {*} dateMomentObject Input Date object
   * @param {*} queryObject Query object which stores all search conditions
   * @param {string} currentDatePattern Date pattern of input dateObject
   * @memberof QueryGenerator
   */
  public static getAddtionalDateFilters(columnName: string, dateMomentObject: any, queryObject: any, currentDatePattern: string) {
    if (!queryObject[Op.or]) {
      queryObject[Op.or] = [];
    }
    switch (currentDatePattern) {
      case Constants.DATE_TIME_ONLY:
      case Constants.DATE_TIME:
        queryObject[Op.or].push({
          [columnName]: dateMomentObject.format(Constants.DATE)
        });
      case Constants.DATE:
        queryObject[Op.or].push({
          [columnName]: dateMomentObject.format(Constants.YEAR_MONTH)
        });
      case Constants.YEAR_MONTH:
        queryObject[Op.or].push({
          [columnName]: dateMomentObject.format(Constants.YEAR)
        });
      default:
        break;
    }
  }

  /**
   * It will generate filter condition for date search
   *
   * @static
   * @param {*} column Column object from config file
   * @param {*} dateObject Input Date object
   * @param {*} queryObject Query object which stores all search conditions
   * @param {symbol} condtionOperator Condtion operator to perform AND/OR operation
   * @param {string} datePattern Date pattern of input dateObject
   * @memberof QueryGenerator
   */
  public static createDateConditions(column: any, dateObject: any, queryObject: any, condtionOperator: symbol, datePattern: string) {
    // As date is a string we have to consider current date also in query
    const operatorMapping = {
      [Constants.PREFIX_GREATER_THAN]: Constants.PREFIX_GREATER_THAN_EQUAL,
      [Constants.PREFIX_LESS_THAN_EQUAL]: Constants.PREFIX_LESS_THAN
    };
    const prefix = operatorMapping[dateObject.prefix] ? operatorMapping[dateObject.prefix] : dateObject.prefix;
    const operation = this.getOperator(prefix);
    const dateMomentObject = moment(dateObject.data, datePattern);
    let periods: unitOfTime.StartOf = Constants.PERIOD_DAYS;
    if (datePattern === Constants.YEAR_MONTH) {
      periods = Constants.PERIOD_MONTHS;
    } else if (datePattern === Constants.YEAR) {
      periods = Constants.PERIOD_YEARS;
    }
    let nextDate = moment(dateMomentObject)
      .add({ [periods]: 1 })
      .format(datePattern);
    let dateQuery = {};
    if (column.rangeAttributes) {
      const rangeObject = this.getParsedCondtions(column.rangeAttributes);
      this.getPeriodDateFilters(column.columnHierarchy, rangeObject, dateMomentObject, queryObject, datePattern, dateObject.prefix, condtionOperator);
    } else {
      switch (dateObject.prefix) {
        case Constants.PREFIX_GREATER_THAN:
        case Constants.PREFIX_LESS_THAN_EQUAL:
          dateQuery = {
            [column.columnHierarchy]: {
              [operation]: nextDate
            }
          };
          break;
        case Constants.PREFIX_GREATER_THAN_EQUAL:
        case Constants.PREFIX_LESS_THAN:
          dateQuery = {
            [column.columnHierarchy]: {
              [operation]: dateObject.data
            }
          };
          break;
        case Constants.PREFIX_NOT_EQUAL:
          dateQuery = {
            [column.columnHierarchy]: {
              [this.getOperator(Constants.PREFIX_LESS_THAN)]: dateObject.data,
              [this.getOperator(Constants.PREFIX_GREATER_THAN_EQUAL)]: nextDate
            }
          };
          break;
        default:
          let operator = Constants.PREFIX_LESS_THAN;
          if (datePattern === Constants.DATE) {
            nextDate = moment(dateMomentObject)
              .utc()
              .endOf(periods)
              .toISOString();
            operator = Constants.PREFIX_LESS_THAN_EQUAL;
          }
          dateQuery = {
            [Op.and]: {
              [column.columnHierarchy]: {
                [this.getOperator(Constants.PREFIX_GREATER_THAN_EQUAL)]: dateObject.data,
                [this.getOperator(operator)]: nextDate
              }
            }
          };
      }
      queryObject[condtionOperator].push(dateQuery);
      if (dateObject.prefix != Constants.PREFIX_NOT_EQUAL) {
        // for not equal operation we will not additional filter
        this.getAddtionalDateFilters(column.columnHierarchy, dateMomentObject, queryObject, datePattern);
      } else {
        // For Not Equal operation we will return records where attribute doesn't exists or != to request value
        const condition: any = {
          [Op.or]: []
        };
        QueryGenerator.createDateNotEqualSearchConditions(column, [dateObject.data, nextDate], condition);
        queryObject[Op.or].push({
          [Op.or]: condition[Op.or]
        });
      }
    }
  }

  /**
   * It will generate filter condition for date-time search
   *
   * @static
   * @param {*} column Column object from config file
   * @param {*} dateObject Input Date object
   * @param {*} queryObject Query object which stores all search conditions
   * @param {symbol} condtionOperator Condtion operator to perform AND/OR operation
   * @param {string} datePattern Date pattern of input dateObject
   * @memberof QueryGenerator
   */
  public static createDateTimeConditions(column: any, dateObject: any, queryObject: any, condtionOperator: symbol, datePattern: string) {
    const operation = this.getOperator(dateObject.prefix);
    const dateMomentObject = moment(dateObject.data, datePattern);
    if (column.rangeAttributes) {
      const rangeObject = this.getParsedCondtions(column.rangeAttributes);
      this.getPeriodDateTimeFilters(column.columnHierarchy, rangeObject, dateMomentObject, queryObject, datePattern, dateObject.prefix, condtionOperator);
    } else {
      queryObject[condtionOperator].push({
        [column.columnHierarchy]: {
          [operation]: dateObject.data
        }
      });
      if (dateObject.prefix != Constants.PREFIX_NOT_EQUAL) {
        // for not equal operation we will not additional filter
        this.getAddtionalDateFilters(column.columnHierarchy, dateMomentObject, queryObject, datePattern);
      } else {
        // For Not Equal operation we will return records where attribute doesn't exists or != to request value
        this.createParitalSearchConditions(column, [dateObject.data], queryObject, Constants.PREFIX_NOT_EQUAL, false);
      }
    }
  }

  /**
   * It will generate filter condition for number search
   *
   * @static
   * @param {*} column Column object from config file
   * @param {string[]} value Input values for search
   * @param {*} queryObject Query object which stores all search conditions
   * @memberof QueryGenerator
   */
  public static createNumberSearchConditions(column: any, value: string[], queryObject: any) {
    let values = value;
    // In case of number value can be in ["1,5"](OR op) or ["ge1","le5"](AND op)
    let condtionOperator = Op.or;
    if (values.length > 1) {
      condtionOperator = Op.and;
    } else {
      values = values[0].split(Constants.COMMA_VALUE);
    }
    for (const eachNumber of values) {
      const numberObject: any = Utility.getSearchPrefixValue(eachNumber);
      const operation = this.getOperator(numberObject.prefix);
      queryObject[condtionOperator].push({
        [column.columnHierarchy]: {
          [operation]: numberObject.data
        }
      });
      if (numberObject.prefix == Constants.PREFIX_NOT_EQUAL) {
        // For Not Equal operation we will return records where attribute doesn't exists or != to request value
        this.createParitalSearchConditions(column, [numberObject.data], queryObject, Constants.PREFIX_NOT_EQUAL, false);
      }
    }
  }

  /**
   * It will identify date pattern for input value and perform AND/OR operation based on input data
   * In case of date value can be in ["2018-10-11,2018-10-12"](OR op) or ["2018-10-11","2018-10-12"](AND op)
   * @static
   * @param {*} column Column object from config file
   * @param {string[]} value Input values for date search operation
   * @param {*} queryObject Query object which stores all search conditions
   * @memberof QueryGenerator
   */
  public static createDateSearchConditions(column: any, value: string[], queryObject: any) {
    const values = value.length == 1 ? value[0].split(Constants.COMMA_VALUE) : value;
    let condtionOperator = Op.or;
    for (const eachDate of values) {
      const dateObject = Utility.getSearchPrefixValue(eachDate);
      const isDateTimeWithoutTimezone = moment(dateObject.data, Constants.DATE_TIME_ONLY, true).isValid();
      const isDateTime = moment(dateObject.data, Constants.DATE_TIME, true).isValid();
      const isDate = moment(dateObject.data, Constants.DATE, true).isValid();
      const isYearMonth = moment(dateObject.data, Constants.YEAR_MONTH, true).isValid();
      const isYear = moment(dateObject.data, Constants.YEAR, true).isValid();
      // If user is perfroming range operation(AND operation) date/year-month/year, then condtionOperator should be Op.and for 2nd date
      // If user is perfroming OR operation date/year-month/year, then condtionOperator should be Op.or for both date
      if (value[0].indexOf(Constants.COMMA_VALUE) == -1) {
        // comma not present means it is an AND operation
        condtionOperator = values.length > 1 && values.indexOf(eachDate) > 0 ? Op.and : Op.or;
      }
      if (!queryObject[condtionOperator]) {
        queryObject[condtionOperator] = [];
      }
      if (isDateTimeWithoutTimezone) {
        this.createDateTimeConditions(column, dateObject, queryObject, condtionOperator, Constants.DATE_TIME_ONLY);
      } else if (isDateTime) {
        this.createDateTimeConditions(column, dateObject, queryObject, condtionOperator, Constants.DATE_TIME);
      } else if (isDate) {
        this.createDateConditions(column, dateObject, queryObject, condtionOperator, Constants.DATE);
      } else if (isYearMonth) {
        this.createDateConditions(column, dateObject, queryObject, condtionOperator, Constants.YEAR_MONTH);
      } else if (isYear) {
        this.createDateConditions(column, dateObject, queryObject, condtionOperator, Constants.YEAR);
      }
    }
  }

  /**
   * It will parse addtion filter conditon for search operation
   * Example: attribute1[{'filterKey':'use', 'filterValue':'connection'}].value
   * @static
   * @param {string} conditions Addtion filter condition for search
   * @returns {*} filter json object
   * @memberof QueryGenerator
   */
  public static getParsedCondtions(conditions: string): any {
    conditions = conditions.replace(new RegExp(Constants.SINGLE_QUOTE, "g"), Constants.DOUBLE_QUOTE);
    const boundryStart = conditions.indexOf(Constants.SQUARE_BRACKETS_OPEN);
    const boundryEnd = conditions.indexOf(Constants.SQUARE_BRACKETS_CLOSE) + 1;
    if (boundryStart > -1 && boundryEnd > -1) {
      conditions = conditions.slice(boundryStart, boundryEnd);
    }
    return JSON.parse(conditions);
  }

  /**
   * It will generate filter condition for boolean search
   * @static
   * @param {*} column Column object from config file
   * @param {string} value Input value for boolean search
   * @param {*} queryObject Query object which stores all search conditions
   * @returns
   * @memberof QueryGenerator
   */
  public static createBooleanSearchConditions(column: any, value: string, queryObject: any) {
    log.info("Entering QueryGenerator :: createBooleanSearchConditions()");
    if (!_.isString(value) || (_.isString(value) && value.length < 1)) {
      // if value is null | undefined | "", then return
      return;
    }
    queryObject[Op.or].push({
      [column.columnHierarchy]: {
        [Op.eq]: value.toLowerCase() === Constants.IS_TRUE
      }
    });
    log.info("Exiting QueryGenerator :: createBooleanSearchConditions()");
  }

  /**
   * It will generate recursive filter condition for nested array search
   * Example: attribute1[*].attribute2.attribute3[*].attribute4
   * @static
   * @param {string[]} attributes Nested array attributes
   * @param {string|number} value Input value for search
   * @param {*} nestedAttributes NestedAttributes to store array search condition
   * @param {boolean} arrFlag Boolean flag to check if input is array type or not
   * @returns
   * @memberof QueryGenerator
   */
  public static getNestedAttributes(attributes: string[], value: string | number, nestedAttributes: any, arrFlag: boolean) {
    if (attributes.length == 1) {
      // if column is an array like address[*].line[*], then we have to convert value to an array
      nestedAttributes[attributes[0].replace(Constants.ARRAY_SEARCH_SYMBOL, Constants.EMPTY_VALUE)] =
        attributes[0].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1 ? [value] : value;
      return;
    }
    arrFlag = attributes[0].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1;
    const attributeName = arrFlag ? attributes[0].replace(Constants.ARRAY_SEARCH_SYMBOL, Constants.EMPTY_VALUE) : attributes[0];
    nestedAttributes[attributeName] = arrFlag ? [{}] : {};
    const objectMap = arrFlag ? nestedAttributes[attributeName][0] : nestedAttributes[attributeName];
    this.getNestedAttributes(attributes.slice(1), value, objectMap, arrFlag);
  }

  /**
   * create search for multiple filter conditions in each level
   *
   * @static
   * @param {*} column Column object from config file
   * @param {*} queryObject Query object which stores all search conditions
   * @memberof QueryGenerator
   */
  public static getAddtionalFilters(column: any, queryObject: any) {
    // modify column.columnHierarchy and reuse createGenericSearchConditions
    if (!queryObject[Op.and]) {
      // addtional fillter should be an AND condtion
      queryObject[Op.and] = [];
    }
    const attributes = column.columnHierarchy.split(Constants.DOT_VALUE);
    const newColumnHierarchy = [];
    let isAdditionalFilterCreated = false;
    for (const element of attributes) {
      // if no filter condition present or type is an object then continue
      // example: dataResource.identifier[{filterKey:use, filterValue:connection}].value
      if (!element.endsWith(Constants.SQUARE_BRACKETS_CLOSE) || element.indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1) {
        newColumnHierarchy.push(element);
        continue;
      }
      // user can provide multiple filter condition per level
      const parentKey = [element.split(Constants.SQUARE_BRACKETS_OPEN)[0], Constants.ARRAY_SEARCH_SYMBOL].join(Constants.EMPTY_VALUE);
      newColumnHierarchy.push(parentKey);
      const filterConditions = this.getParsedCondtions(element);
      for (const eachCondition of filterConditions) {
        if (!eachCondition.filterValue) {
          // if empty filter conditon, identifier[{}].value
          continue;
        }
        isAdditionalFilterCreated = true;
        const additonalCondition = {};
        column.columnHierarchy = newColumnHierarchy.concat([eachCondition.filterKey]).join(Constants.DOT_VALUE);
        // current columnHierarchy: dataResource.identifier[{filterKey:use, filterValue:connection}].value
        // generated columnHierarchy: dataResource.identifier[*].use
        this.createGenericSearchConditions(column, eachCondition.filterValue, additonalCondition);
        // it always returns conditions with Op.or as it works for single attribute
        if (additonalCondition[Op.or] && additonalCondition[Op.or].length > 0) {
          queryObject[Op.and] = queryObject[Op.and].concat(additonalCondition[Op.or]);
        }
      }
    }
    if (isAdditionalFilterCreated) {
      // reset column Hierarchy to original
      column.columnHierarchy = newColumnHierarchy.join(Constants.DOT_VALUE);
    }
  }

  /**
   * It will generate like query for array search
   *
   * @static
   * @param {*} column Column object from config file
   * @param {any[]} values Input values for search
   * @param {*} queryObject Query object which stores all search conditions
   * @param {string} [operator] optional parameter for operator like ne/eq/le etc
   * @param {boolean} [isDate] boolean flag date condition
   * @returns
   * @memberof QueryGenerator
   */
  public static createParitalSearchConditions(column: any, values: any[], queryObject: any, operator?: string, isDate?: boolean) {
    /*
      it will generate like query for below scenarios
      channels[*]
      name.given[*]
      address[*].line[*]
      code.coding[*].code
      category[*].coding[*].code
      component[*].code.coding[*].code
    */
    const attributes = column.columnHierarchy.split(Constants.DOT_VALUE);
    const parentAttribute = attributes[0].replace(Constants.ARRAY_SEARCH_SYMBOL, Constants.EMPTY_VALUE);
    let idx = 1;
    let isParrentArray = attributes[0].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1;
    let parentIdx = 0;
    const expression = [[Constants.DOUBLE_QUOTE + parentAttribute + Constants.DOUBLE_QUOTE]];
    let multilevelObject = [];
    while (idx < attributes.length) {
      let childValue = attributes[idx].replace(Constants.ARRAY_SEARCH_SYMBOL, Constants.EMPTY_VALUE);
      if (attributes[idx + 1] && attributes[idx].indexOf(Constants.ARRAY_SEARCH_SYMBOL) == -1) {
        multilevelObject.push(childValue);
        idx++;
        continue;
      }
      if (isParrentArray) {
        parentIdx++;
        expression.push([]);
      }
      if (!attributes[idx + 1] && attributes[idx].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1) {
        expression.push([]);
        // added for scenario like address[*].line[*]
      }
      childValue = multilevelObject.concat(childValue).join(Constants.COMMA_VALUE);
      expression[parentIdx] = expression[parentIdx].concat(["#>", `'{${childValue}}'`]);
      multilevelObject = [];
      isParrentArray = attributes[idx].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1;
      idx++;
    }
    let index = 1;
    let expression1 = expression[0].join(Constants.SPACE_VALUE);
    let expression2 = Constants.EMPTY_VALUE;
    let rawSql = Constants.EMPTY_VALUE;
    if (expression.length == 1) {
      if (column.columnHierarchy.indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1) {
        rawSql = `unnest(array(select jsonb_array_elements(${expression1}) ))`;
      } else {
        rawSql = `unnest(array(select jsonb_array_elements(jsonb_build_array(${expression1})) ))`;
      }
    } else {
      while (index < expression.length) {
        expression2 = expression[index] ? expression[index].join(Constants.SPACE_VALUE) : Constants.SPACE_VALUE;
        const unnestSql = `unnest(array(select jsonb_array_elements(${expression1}) ${expression2}))`;
        index += 1;
        expression1 = unnestSql;
        rawSql = unnestSql;
      }
    }
    let existsValue = "exists";
    let originalOperator = "";
    if (!operator) {
      operator = column.operation === Constants.OPERATION_WORD_MATCH ? Constants.POSIX_ILIKE_OPERATOR : Constants.ILIKE_OPERATOR;
    } else {
      // Set originalOperator for numeric value
      originalOperator = operator;
      existsValue = operator == Constants.PREFIX_NOT_EQUAL ? "not exists" : "exists";
      operator = operator == Constants.PREFIX_NOT_EQUAL ? Constants.PREFIX_EQUAL : operator;
      operator = this.getNumericSymbol(operator);
    }
    if (isDate && originalOperator == Constants.PREFIX_NOT_EQUAL) {
      existsValue = "not exists";
    }
    // Added for sharing rules nested search, if input is number then we have to cast it
    if (typeof values[0] === Constants.TYPE_NUMBER) {
      // In case of number, for NOT_EQUAL operation, we will use exists operation and operator will be not equal inside
      originalOperator = originalOperator == Constants.PREFIX_NOT_EQUAL ? Constants.PREFIX_EQUAL : originalOperator;
      values = [originalOperator + values[0].toString()];
      column.operation = Constants.OPERATION_NUMERIC_MATCH;
    }
    if (typeof values[0] === Constants.TYPE_BOOLEAN) {
      column.operation = Constants.TYPE_BOOLEAN;
    }
    const searchQuery = [];
    if (column.operation === Constants.OPERATION_NUMERIC_MATCH) {
      _.each(values, (eachValue: any) => {
        const numberObject = Utility.getSearchPrefixValue(eachValue);
        const numericOperation = this.getNumericSymbol(numberObject.prefix);
        eachValue = this.getUpdatedSearchValue(numberObject.data, column);
        // to handel json null condition https://www.postgresql.org/docs/9.5/functions-json.html
        searchQuery.push(
          ` ${existsValue} (select true from ${rawSql} as element where ` +
            `(case when element = 'null'  then null else element end )::text::numeric ${numericOperation} ${eachValue})`
        );
      });
    } else if (column.operation === Constants.TYPE_BOOLEAN) {
      _.each(values, (eachValue: any) => {
        searchQuery.push(` ${existsValue} (select true from ${rawSql} as element where element::text ${operator} '${eachValue}')`);
      });
    } else {
      _.each(values, (eachValue: any) => {
        eachValue = this.getUpdatedSearchValue(eachValue, column, true);
        searchQuery.push(` ${existsValue} (select true from ${rawSql} as element where element::text ${operator} '${eachValue}')`);
      });
    }
    queryObject[Op.or].push(literal(searchQuery.join(" or ")));
  }

  public static createDateNotEqualSearchConditions(column: any, values: any[], queryObject: any) {
    const attributes = column.columnHierarchy.split(Constants.DOT_VALUE);
    const parentAttribute = attributes[0].replace(Constants.ARRAY_SEARCH_SYMBOL, Constants.EMPTY_VALUE);
    let idx = 1;
    let isParrentArray = attributes[0].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1;
    let parentIdx = 0;
    const expression = [[Constants.DOUBLE_QUOTE + parentAttribute + Constants.DOUBLE_QUOTE]];
    let multilevelObject = [];
    while (idx < attributes.length) {
      let childValue = attributes[idx].replace(Constants.ARRAY_SEARCH_SYMBOL, Constants.EMPTY_VALUE);
      if (attributes[idx + 1] && attributes[idx].indexOf(Constants.ARRAY_SEARCH_SYMBOL) == -1) {
        multilevelObject.push(childValue);
        idx++;
        continue;
      }
      if (isParrentArray) {
        parentIdx++;
        expression.push([]);
      }
      if (!attributes[idx + 1] && attributes[idx].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1) {
        expression.push([]);
        // added for scenario like address[*].line[*]
      }
      childValue = multilevelObject.concat(childValue).join(Constants.COMMA_VALUE);
      expression[parentIdx] = expression[parentIdx].concat(["#>", `'{${childValue}}'`]);
      multilevelObject = [];
      isParrentArray = attributes[idx].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1;
      idx++;
    }
    let index = 1;
    let expression1 = expression[0].join(Constants.SPACE_VALUE);
    let expression2 = Constants.EMPTY_VALUE;
    let rawSql = Constants.EMPTY_VALUE;
    if (expression.length == 1) {
      if (column.columnHierarchy.indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1) {
        rawSql = `unnest(array(select jsonb_array_elements(${expression1}) ))`;
      } else {
        rawSql = `unnest(array(select jsonb_array_elements(jsonb_build_array(${expression1})) ))`;
      }
    } else {
      while (index < expression.length) {
        expression2 = expression[index] ? expression[index].join(Constants.SPACE_VALUE) : Constants.SPACE_VALUE;
        const unnestSql = `unnest(array(select jsonb_array_elements(${expression1}) ${expression2}))`;
        index += 1;
        expression1 = unnestSql;
        rawSql = unnestSql;
      }
    }
    const existsValue = "not exists";
    const searchQuery = [];
    _.each(values, (eachValue: any, valIdx: any) => {
      eachValue = this.getUpdatedSearchValue(eachValue, column, true);
      const operator = valIdx === 0 ? Constants.GREATER_THAN_EQUAL : Constants.LESS_THAN;
      searchQuery.push(` ${existsValue} (select true from ${rawSql} as element where element::text ${operator} '${eachValue}')`);
    });
    queryObject[Op.or].push(literal(searchQuery.join(" or ")));
  }

  /**
   * It will generate search query for string
   *
   * @static
   * @param {*} column Column object from config file
   * @param {string} value Input value for search
   * @param {*} queryObject Query object which stores all search conditions
   * @returns
   * @memberof QueryGenerator
   */
  public static createGenericSearchConditions(column: any, value: string, queryObject: any) {
    log.info("Entering QueryGenerator :: createGenericSearchConditions()");
    if (!_.isString(value) || (_.isString(value) && value.length < 1)) {
      // if value is null | undefined | "", then return
      return;
    }
    if (!queryObject[Op.or]) {
      queryObject[Op.or] = [];
    }
    // Generate Search Query for string type
    const values = value.split(Constants.COMMA_VALUE);
    const operator = this.getOperator(column.operation);
    if (column.columnValueType != Constants.TYPE_ARRAY) {
      queryObject[Op.or] = queryObject[Op.or].concat(
        _.map(values, (eachValue: any) => {
          return {
            [column.columnHierarchy]: {
              [operator]: this.getUpdatedSearchValue(eachValue, column)
            }
          };
        })
      );
      return;
    }
    // To perform like/ilike operation with array of object, we need raw sql support
    if (
      [
        Constants.OPERATION_LIKE,
        Constants.OPERATION_STARTS_WITH,
        Constants.OPERATION_ENDS_WITH,
        Constants.OPERATION_WORD_MATCH,
        Constants.OPERATION_NUMERIC_MATCH
      ].indexOf(column.operation) > -1
    ) {
      this.createParitalSearchConditions(column, values, queryObject);
      return;
    }
    // array will perform only contains operation
    // Perform search for array type structure
    const attributes = column.columnHierarchy.split(Constants.DOT_VALUE);
    const parentAttribute = attributes[0].replace(Constants.ARRAY_SEARCH_SYMBOL, Constants.EMPTY_VALUE);
    const isMultilevelNesting = attributes.length > 1;
    if (!isMultilevelNesting) {
      queryObject[Op.or] = queryObject[Op.or].concat(
        _.map(values, (eachValue: any) => {
          return {
            [parentAttribute]: {
              [Op.contains]: [this.getUpdatedSearchValue(eachValue, column)]
            }
          };
        })
      );
    } else {
      const arrFlag = attributes[0].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1;
      // it will create filter condition for sitecode and usercode
      _.each(values, (eachValue: any) => {
        let nestedAttributes = {};
        const updatedSearchValue = this.getUpdatedSearchValue(eachValue, column);
        this.getNestedAttributes(attributes.slice(1), updatedSearchValue, nestedAttributes, false);
        if (arrFlag) {
          nestedAttributes = [nestedAttributes];
        }
        queryObject[Op.or].push({
          [parentAttribute]: {
            [Op.contains]: nestedAttributes
          }
        });
      });
    }
    log.info("Exiting QueryGenerator :: createGenericSearchConditions()");
  }

  /**
   * It will generate search for Multiple attribute
   *
   * @static
   * @param {*} mappedAttribute attribute mapping for search
   * @param {*} value Input value for search
   * @returns
   * @memberof QueryGenerator
   */
  public static getMultiAttibuteSearchCondition(mappedAttribute: any, value: any) {
    const queryObject: any = {
      [Op.or]: []
    };
    for (const eachColumn of mappedAttribute.to) {
      this.getAddtionalFilters(eachColumn, queryObject);
      switch (eachColumn.columnValueType) {
        case Constants.TYPE_BOOLEAN:
          this.createBooleanSearchConditions(eachColumn, value[0], queryObject);
          break;
        case Constants.TYPE_DATE:
          this.createDateSearchConditions(eachColumn, value, queryObject);
          break;
        case Constants.TYPE_NUMBER:
          this.createNumberSearchConditions(eachColumn, value, queryObject);
          break;
        // case "multicolumn":
        //   this.createMultiSearchConditions(mappedAttribute, value, searchObject, endPoint);
        //   break;
        default:
          this.createGenericSearchConditions(eachColumn, value[0], queryObject);
      }
    }
    // if any duplicate condtion present for date/period then filter it out, so that it won't generate addtional query
    queryObject[Op.or] = _.uniqWith(queryObject[Op.or], _.isEqual);
    return queryObject;
  }

  /**
   * Entry function to create search condtions for all query parameters
   *
   * @static
   * @param {*} searchRequest Input query prameter for which we will generate search query
   * @param {*} attributesMapping attribute mapping for search
   * @returns {object}
   * @memberof QueryGenerator
   */
  public static getFilterCondition(searchRequest: any, attributesMapping: any): object {
    log.info("Entering QueryGenerator :: getFilterCondition()");
    const searchObject: any = {};
    for (const key in searchRequest) {
      const mappedAttribute: any = attributesMapping[key];
      const operator = mappedAttribute.to.length > 1 ? Op.or : Op.and;
      if (!searchObject[operator]) {
        searchObject[operator] = [];
      }
      const value = searchRequest[key];
      const queryObject: any = this.getMultiAttibuteSearchCondition(mappedAttribute, value);
      searchObject[operator].push(queryObject);
    }
    log.info("Exiting QueryGenerator :: getFilterCondition()");
    return searchObject;
  }
}

export { QueryGenerator };
