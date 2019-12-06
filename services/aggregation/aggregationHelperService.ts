/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import * as moment from "moment";
import { cast, col, fn, json, literal, Op } from "sequelize";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import * as config from "../../common/objects/config";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { Utility } from "../common/Utility";
import { AggregationValidatorUtility } from "./aggregationValidatorUtility";

class AggregationHelperService {
  public static async searchRecords(
    serviceModel: any,
    authorizerData: any,
    httpMethod: string,
    searchAttributes: any,
    queryParams: any,
    mandatoryAttribute: string,
    endPoint: string,
    attributes: string[],
    appendUserProfile?: boolean
  ): Promise<object[]> {
    log.info("Entering DataService :: searchRecords()");
    // If no search parameter is specified then user should get all his data
    if (!queryParams.hasOwnProperty(mandatoryAttribute)) {
      log.debug("Mandatory attribute is added from Cognito");
      queryParams[mandatoryAttribute] = [authorizerData.profile];
    }
    AggregationValidatorUtility.validateQueryParams(queryParams, searchAttributes);

    // add "UserProfile" as prefix to user attribute like informationSource/subject/patient
    if (appendUserProfile) {
      for (const displayAttribute of config.data.displayFields) {
        if (queryParams[displayAttribute]) {
          queryParams[displayAttribute] = [["UserProfile", queryParams[displayAttribute]].join("/")];
        }
      }
    }
    // check added to filter soft deleted records
    if (!queryParams.hasOwnProperty("isDeleted")) {
      queryParams["isDeleted"] = ["false"];
    }
    const paginationInfo: any = Utility.getPaginationInfo(queryParams);
    const result = this.searchDatabaseRows(queryParams, serviceModel, searchAttributes, attributes, paginationInfo);
    log.info("Exiting DataService :: searchRecords()");
    return result;
  }

  public static async searchDatabaseRows(queryParams: any, serviceModel: any, searchAttributes: any, attributes: string[], paginationInfo?): Promise<object[]> {
    log.info("Entering BaseService :: getSearchDatabaseRows()");
    log.debug("Start-DBCall: " + new Date().toISOString());
    const queryObject: any = this.prepareSearchQuery(queryParams, searchAttributes, attributes, paginationInfo);
    const result: any = await serviceModel.findAll(queryObject);
    result.limit = queryObject.limit;
    result.offset = queryObject.offset;
    log.debug("End-DBCall: " + new Date().toISOString());
    log.info("Number of records retrieved: " + result.length);
    log.info("Exiting DataService :: getSearchDatabaseRows()");
    /*
      dataResource contains whole json object, if dataResource is there in attribute
      then return dataResource else return data for all attributes
    */

    const res: any = _.map(result, (d) => {
      return attributes.indexOf("dataResource") > -1 ? d.dataResource : d;
    });
    res.limit = result.limit;
    res.offset = result.offset;
    return res;
  }

  /**
   * Decides the boolean condition to be performed between multiple search parameters
   * @param mappedAttribute
   * @param value
   * @param searchObject
   */
  public static createBooleanSearchConditions(mappedAttribute, value, searchObject) {
    log.info("Entering DataHelperService :: createBooleanSearchConditions()");
    if (_.isString(value)) {
      value = value.trim().toLowerCase() === "true";
      searchObject[mappedAttribute.to] = {
        [Op.eq]: value
      };
    }
    log.info("Exiting DataHelperService :: createBooleanSearchConditions()");
    return;
  }

  /**
   * Create date based conditions for database search
   * @param mappedAttribute
   * @param value
   * @param searchObject
   */
  public static createDateSearchConditions(mappedAttribute, value, searchObject) {
    log.info("Entering DataHelperService :: createDateSearchConditions()");
    const operatorMap = {
      ge: Op.gte,
      le: Op.lte,
      gt: Op.gt,
      lt: Op.lt,
      eq: Op.eq
    };
    let condtionType = "OR";
    let condtionOperator = Op.or;
    if (value.length > 1) {
      condtionType = "AND";
      condtionOperator = Op.and;
    }
    searchObject[condtionOperator] = [];
    let values = value;
    if (mappedAttribute.isMultiple) {
      values = condtionType === "OR" ? value[0].split(",") : value;
    }
    for (const item in values) {
      const dateValues = {};
      const dateObject = Utility.getPrefixDate(values[item]);
      const isDateTime = moment(dateObject.date, "YYYY-MM-DDTHH:mm:ss.SSSSZ", true).isValid();
      const isDate = moment(dateObject.date, "YYYY-MM-DD", true).isValid();
      const isYearMonth = moment(dateObject.date, "YYYY-MM", true).isValid();
      const isYear = moment(dateObject.date, "YYYY", true).isValid();
      dateValues["dateTime"] = dateObject;
      dateValues["currentDate"] = moment(dateObject.date).format("YYYY-MM-DD");
      dateValues["currentYearMonth"] = moment(dateObject.date).format("YYYY-MM");
      dateValues["currentYear"] = moment(dateObject.date).format("YYYY");
      const operation = operatorMap[dateObject.prefix] ? operatorMap[dateObject.prefix] : Op.eq;
      if (isDateTime) {
        AggregationHelperService.createDateTimeConditions(mappedAttribute, operatorMap, searchObject, condtionOperator, operation, dateValues);
      } else if (isDate) {
        AggregationHelperService.createDateConditions(mappedAttribute, operatorMap, searchObject, condtionOperator, operation, dateValues);
      } else if (isYearMonth) {
        AggregationHelperService.createYearMonthConditions(mappedAttribute, operatorMap, searchObject, condtionOperator, operation, dateValues);
      } else if (isYear) {
        AggregationHelperService.createYearConditions(mappedAttribute, operatorMap, searchObject, condtionOperator, operation, dateValues);
      } else {
        throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + mappedAttribute.map);
      }
    }
    log.info("Exiting AggregationHelperService :: createDateSearchConditions()");
  }

  /**
   * @param mappedAttribute
   * @param operatorMap
   * @param searchObject
   * @param condtionOperator
   * @param operation
   * @param dateValues
   */
  public static createDateTimeConditions(mappedAttribute: any, operatorMap: any, searchObject: any, condtionOperator: any, operation: any, dateValues: any) {
    log.info("Entering DataHelperService :: createDateTimeConditions()");
    const singleItemConditions = {};
    if (mappedAttribute.isPeriod) {
      singleItemConditions[Op.or] = [
        {
          [mappedAttribute.periodAttribute]: {
            start: {
              [operatorMap.le]: dateValues.dateTime.date
            },
            end: {
              [operatorMap.ge]: dateValues.dateTime.date
            }
          }
        },
        {
          [mappedAttribute.to]: {
            [operation]: dateValues.dateTime.date
          }
        },
        {
          [mappedAttribute.periodAttribute]: {
            start: {
              [operatorMap.le]: dateValues.currentDate
            },
            end: {
              [operatorMap.ge]: dateValues.currentDate
            }
          }
        },
        {
          [mappedAttribute.to]: {
            [Op.eq]: dateValues.currentDate
          }
        },
        {
          [mappedAttribute.to]: {
            [Op.eq]: dateValues.currentYearMonth
          }
        },
        {
          [mappedAttribute.to]: {
            [Op.eq]: dateValues.currentYear
          }
        }
      ];
      searchObject[condtionOperator].push(singleItemConditions);
    } else {
      if (dateValues.dateTime.prefix.length === 0) {
        singleItemConditions[Op.or] = [
          {
            [mappedAttribute.to]: {
              [Op.eq]: dateValues.dateTime.date
            }
          },
          {
            [mappedAttribute.to]: {
              [Op.eq]: dateValues.currentDate
            }
          },
          {
            [mappedAttribute.to]: {
              [Op.eq]: dateValues.currentYearMonth
            }
          },
          {
            [mappedAttribute.to]: {
              [Op.eq]: dateValues.currentYear
            }
          }
        ];
        searchObject[condtionOperator].push(singleItemConditions);
      } else {
        singleItemConditions[Op.or] = [
          {
            [mappedAttribute.to]: {
              [operation]: dateValues.dateTime.date
            }
          },
          {
            [mappedAttribute.to]: {
              [Op.eq]: dateValues.currentDate
            }
          },
          {
            [mappedAttribute.to]: {
              [Op.eq]: dateValues.currentYearMonth
            }
          },
          {
            [mappedAttribute.to]: {
              [Op.eq]: dateValues.currentYear
            }
          }
        ];
        searchObject[condtionOperator].push(singleItemConditions);
      }
    }
    log.info("Exiting DataHelperService :: createDateTimeConditions()");
  }

  /**
   * @param mappedAttribute
   * @param operatorMap
   * @param searchObject
   * @param condtionOperator
   * @param operation
   * @param dateValues
   */
  public static createDateConditions(mappedAttribute: any, operatorMap: any, searchObject: any, condtionOperator: any, operation: any, dateValues: any) {
    log.info("Entering DataHelperService :: createDateConditions()");
    const singleItemConditions = {};
    const nextDate = moment(moment(dateValues.currentDate).add(1, "days")).format("YYYY-MM-DD");
    if (mappedAttribute.isPeriod) {
      switch (dateValues.dateTime.prefix) {
        case "gt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextDate
                },
                end: {
                  [operatorMap.ge]: dateValues.currentDate
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.gte]: nextDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "lt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextDate
                },
                end: {
                  [operatorMap.ge]: dateValues.currentDate
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.lt]: dateValues.currentDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "ge":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextDate
                },
                end: {
                  [operatorMap.ge]: dateValues.currentDate
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.gte]: dateValues.currentDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "le":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextDate
                },
                end: {
                  [operatorMap.ge]: dateValues.currentDate
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.lt]: nextDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        default:
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextDate
                },
                end: {
                  [operatorMap.ge]: dateValues.currentDate
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.gte]: dateValues.currentDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.lt]: nextDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
      }
    } else {
      switch (dateValues.dateTime.prefix) {
        case "gt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.gte]: nextDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "le":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.lt]: nextDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "ge":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.gte]: dateValues.currentDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "lt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.lt]: dateValues.currentDate
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        default:
          singleItemConditions[Op.or] = [
            {
              [Op.and]: [
                {
                  [mappedAttribute.to]: {
                    [operatorMap.ge]: dateValues.currentDate
                  }
                },
                {
                  [mappedAttribute.to]: {
                    [operatorMap.lt]: nextDate
                  }
                }
              ]
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
      }
    }
    log.info("Exiting DataHelperService :: createDateConditions()");
  }

  /**
   * @param mappedAttribute
   * @param operatorMap
   * @param searchObject
   * @param condtionOperator
   * @param operation
   * @param dateValues
   */
  public static createYearMonthConditions(mappedAttribute: any, operatorMap: any, searchObject: any, condtionOperator: any, operation: any, dateValues: any) {
    log.info("Entering DataHelperService :: createYearMonthConditions()");
    const singleItemConditions = {};
    const nextMonth = moment(moment(dateValues.currentDate).add(1, "months")).format("YYYY-MM");
    if (mappedAttribute.isPeriod) {
      switch (dateValues.dateTime.prefix) {
        case "gt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextMonth
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYearMonth
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.gte]: nextMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "lt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextMonth
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYearMonth
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.lt]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "ge":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextMonth
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYearMonth
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.gte]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "le":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextMonth
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYearMonth
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.lt]: nextMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        default:
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextMonth
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYearMonth
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.gte]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.lt]: nextMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
      }
    } else {
      switch (dateValues.dateTime.prefix) {
        case "gt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.gte]: nextMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "le":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.lt]: nextMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "ge":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.gte]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "lt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.lt]: dateValues.currentYearMonth
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        default:
          singleItemConditions[Op.or] = [
            {
              [Op.and]: [
                {
                  [mappedAttribute.to]: {
                    [operatorMap.ge]: dateValues.currentYearMonth
                  }
                },
                {
                  [mappedAttribute.to]: {
                    [operatorMap.lt]: nextMonth
                  }
                }
              ]
            },
            {
              [mappedAttribute.to]: {
                [Op.eq]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
      }
    }
    log.info("Exiting DataHelperService :: createYearMonthConditions()");
  }

  /**
   * @param mappedAttribute
   * @param operatorMap
   * @param searchObject
   * @param condtionOperator
   * @param operation
   * @param dateValues
   */
  public static createYearConditions(mappedAttribute: any, operatorMap: any, searchObject: any, condtionOperator: any, operation: any, dateValues: any) {
    log.info("Entering DataHelperService :: createYearConditions()");
    const singleItemConditions = {};
    const nextYear = moment(moment(dateValues.currentDate).add(1, "years")).format("YYYY");
    if (mappedAttribute.isPeriod) {
      switch (dateValues.dateTime.prefix) {
        case "gt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextYear
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYear
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.gte]: nextYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "lt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextYear
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYear
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.lt]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "ge":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextYear
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYear
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.gte]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "le":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextYear
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYear
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.lt]: nextYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        default:
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: nextYear
                },
                end: {
                  [operatorMap.ge]: dateValues.currentYear
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.gte]: dateValues.currentYear
              }
            },
            {
              [mappedAttribute.to]: {
                [Op.lt]: nextYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
      }
    } else {
      switch (dateValues.dateTime.prefix) {
        case "gt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.gte]: nextYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "le":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.lt]: nextYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "ge":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.gte]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        case "lt":
          singleItemConditions[Op.or] = [
            {
              [mappedAttribute.to]: {
                [Op.lt]: dateValues.currentYear
              }
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
          break;
        default:
          singleItemConditions[Op.or] = [
            {
              [Op.and]: [
                {
                  [mappedAttribute.to]: {
                    [operatorMap.ge]: dateValues.currentYear
                  }
                },
                {
                  [mappedAttribute.to]: {
                    [operatorMap.lt]: nextYear
                  }
                }
              ]
            }
          ];
          searchObject[condtionOperator].push(singleItemConditions);
      }
    }
    log.info("Exiting DataHelperService :: createYearConditions()");
  }

  /**
   * Create non-date based search conditions
   * @param mappedAttribute
   * @param value
   * @param searchObject
   */
  public static createGenericSearchConditions(mappedAttribute, value, searchObject) {
    log.info("Entering DataHelperService :: createGenericSearchConditions()");
    if (!_.isString(value) || (_.isString(value) && value.length < 1)) {
      // if value is null | undefined | "", then return
      return;
    }
    if (mappedAttribute.type === "array") {
      const attributes = mappedAttribute.to.split(".");
      if (attributes.length > 1) {
        const values: string[] = mappedAttribute.isMultiple ? value.split(",") : [value];
        for (const item of values) {
          let nestedAttributes = {};
          this.getNestedAttributes(attributes.slice(1), item, nestedAttributes, false);
          const arrFlag = attributes[0].indexOf("[*]") > -1;
          let parentAttribute = attributes[0];
          if (arrFlag) {
            parentAttribute = parentAttribute.replace("[*]", "");
            nestedAttributes = [nestedAttributes];
          }
          if (!searchObject[parentAttribute]) {
            searchObject[parentAttribute] = {};
          }
          if (mappedAttribute.arrayOperator) {
            if (searchObject[parentAttribute][Op[mappedAttribute.arrayOperator]]) {
              searchObject[parentAttribute][Op[mappedAttribute.arrayOperator]].push({
                [Op.contains]: nestedAttributes
              });
            } else {
              searchObject[parentAttribute] = {
                [Op[mappedAttribute.arrayOperator]]: [
                  {
                    [Op.contains]: nestedAttributes
                  }
                ]
              };
            }
          } else {
            if (searchObject[parentAttribute][Op.or]) {
              searchObject[parentAttribute][Op.or].push({
                [Op.contains]: nestedAttributes
              });
            } else {
              searchObject[parentAttribute] = {
                [Op.or]: [
                  {
                    [Op.contains]: nestedAttributes
                  }
                ]
              };
            }
          }
        }
      } else {
        // comes here if mapped type is array but we match on attribute itself as nested properties are not present (like string)
        const parentAttribute = attributes[0].replace("[*]", "");
        if (!searchObject[parentAttribute]) {
          searchObject[parentAttribute] = {
            [Op.or]: []
          };
        }
        // multi-value support for searching in array elements
        // example for push,email we want attribute to match for ["push"] OR ["email"]
        const values: string[] = mappedAttribute.isMultiple ? value.split(",") : [value];
        values.forEach((entry) => {
          searchObject[parentAttribute][Op.or].push({
            [Op.contains]: [entry]
          });
        });
      }
    } else {
      value = mappedAttribute.isMultiple ? value.split(",") : value;
      const operator = mappedAttribute.isMultiple ? Op.or : Op.eq;
      searchObject[mappedAttribute.to] = {
        [operator]: value
      };
    }
    log.info("Exiting DataHelperService :: createGenericSearchConditions()");
  }

  /**
   * Create non-date multi column based search conditions
   * @param mappedAttribute
   * @param value
   * @param searchObject
   * @param searchAttributes
   */
  public static createMultiSearchConditions(mappedAttribute, values, searchObject, searchAttributes: any) {
    searchObject[Op.or] = [];
    for (const item of values) {
      const searchObjectSingle: any = {};
      for (const key in item) {
        const mappedAttributeSingle: any = this.getMappedAttribute(key, "map", searchAttributes);
        const value = item[key];
        this.createGenericSearchConditions(mappedAttributeSingle, value[0], searchObjectSingle);
      }
      searchObject[Op.or].push(searchObjectSingle);
    }
  }

  /**
   * Create dynamic search query for nested objects
   * @param attributes
   * @param value
   * @param nestedAttributes
   * @param arrFlag
   */
  public static getNestedAttributes(attributes, value, nestedAttributes, arrFlag) {
    if (attributes.length == 1) {
      nestedAttributes[attributes[0]] = value;
      return;
    }
    arrFlag = attributes[0].indexOf("[*]") > -1;
    const attributeName = arrFlag ? attributes[0].replace("[*]", "") : attributes[0];
    nestedAttributes[attributeName] = arrFlag ? [{}] : {};
    const objectMap = arrFlag ? nestedAttributes[attributeName][0] : nestedAttributes[attributeName];
    this.getNestedAttributes(attributes.slice(1), value, objectMap, arrFlag);
  }

  /**
   * Retuns the Mapped attributes on basis of provided endpoints.
   * @param attribute
   * @param prop
   * @param endpoint
   * @returns {any}
   */
  public static getMappedAttribute(attribute, prop, searchAttributes: any) {
    log.info("Inside Utility: getMappedAttribute()");
    // const mapped = config.settings[endpoint].searchAttributes;
    const index = searchAttributes.findIndex((x) => x[prop] == attribute);
    if (index > -1) {
      return searchAttributes[index];
    } else {
      return null;
    }
  }

  /**
   * Generates search query based on type of search required by considering all business logics.
   * @param searchRequest
   * @param {any} searchAttributes
   * @returns {object}
   */
  public static prepareSearchQuery(searchRequest, searchAttributes, attributes?: any, paginationInfo?: any, orderBy?: string[]): object {
    log.info("Entering DataHelperService :: prepareSearchQuery()");
    const defaultOrderBy: string[][] = [["meta.lastUpdated", "DESC"]];
    const queryObject: any = {
      where: {},
      order: orderBy ? literal(orderBy) : defaultOrderBy
    };
    const searchObject: any = {};
    if (attributes.length > 0) {
      queryObject.attributes = attributes;
    }
    for (const key in searchRequest) {
      // if "limit", "offset" present in query then we don't map to any attribute, it will only used for pagination
      // TODO: CodeReview : This should be removed - the searchRequest passed into this method should only contain the search parameters.
      if (["limit", "offset"].indexOf(key) > -1) {
        continue;
      }
      const mappedAttribute: any = this.getMappedAttribute(key, "map", searchAttributes);
      // if attribute not present then skip this attribute and move ahead
      if (!mappedAttribute) {
        continue;
      }
      const value = searchRequest[key];
      // Multivalue support only present for date
      // TODO: is the searchRequest assumed to be valid here? could value be an empty array? if so fix the boolean and default
      switch (mappedAttribute.type) {
        case "boolean":
          this.createBooleanSearchConditions(mappedAttribute, value[0], searchObject);
          break;
        case "date":
          this.createDateSearchConditions(mappedAttribute, value, searchObject);
          break;
        case "multicolumn":
          this.createMultiSearchConditions(mappedAttribute, value, searchObject, searchAttributes);
          break;
        default:
          this.createGenericSearchConditions(mappedAttribute, value[0], searchObject);
      }
    }
    queryObject.where = searchObject;
    if (!_.isEmpty(paginationInfo)) {
      queryObject.limit = paginationInfo.limit + 1;
      queryObject.offset = paginationInfo.offset;
    }
    log.info("Generated Query: ", queryObject);
    log.info("Exiting DataHelperService :: prepareSearchQuery()");
    return queryObject;
  }

  /**
   * Generates aggregation projections for non-component based aggregation scenario.
   * @param {object[]} aggregations aggregation attributes from the config.
   * @param {string} aggregationType Type of aggregation needs to perform stats or histogram or both.
   * @returns {any[]}
   */
  public static prepareAggregationProjections(aggregations: object[], aggregationType: string): any {
    log.info("Entering DataHelperService :: prepareAggregationProjections()");
    const projections: any[] = [];

    aggregations.forEach((aggregation) => {
      const functions: string[] = _.get(aggregation, "functions");
      const tableCol: string = _.get(aggregation, "column");
      const tableCast: string = _.get(aggregation, "cast");
      const alias: string = _.get(aggregation, "alias");
      const childLiteral: string = _.get(aggregation, "literal");
      const convertTo: string = _.get(aggregation, "convertTo");
      if (aggregationType === "stats") {
        if (functions) {
          // columns on which specific functions need to be applied
          functions.forEach((func) => {
            if (func === "to_date") {
              projections.push([fn(func, col(tableCol), "YYYY-MM-DD"), alias ? alias : func]);
            } else {
              if (tableCast) {
                projections.push([fn(func, cast(json(tableCol), tableCast)), alias ? alias : func]);
              } else if (convertTo) {
                projections.push([fn(func, json(tableCol)), alias ? alias : func]);
              } else {
                projections.push([fn(func, col(tableCol)), alias ? alias : func]);
              }
            }
          });
        } else {
          // standard columns to output projection
          const columns = _.get(aggregation, "columns");
          columns.forEach((column) => {
            if (convertTo) {
              if (alias) {
                if (tableCast) {
                  projections.push([cast(json(column), "jsonb"), alias]);
                } else {
                  projections.push([json(column), alias]);
                }
              } else {
                if (tableCast) {
                  projections.push([cast(json(column), "jsonb")]);
                } else {
                  projections.push([json(column)]);
                }
              }
            } else {
              projections.push(column);
            }
          });
        }
      } else if (aggregationType === "histogramSubQuery" || aggregationType === "histogram") {
        if (alias) {
          projections.push(childLiteral + " as " + alias);
        } else {
          projections.push(childLiteral);
        }
      }
    });
    log.info("Exiting DataHelperService :: prepareAggregationProjections()");
    return projections;
  }

  /**
   * Generates aggregation subquery for the component based scenario.
   * @param {any}searchRequest query parameters.
   * @param {string} endPoint Service name.
   * @param {object} attributes columns to be fetched.
   * @param {any} configuration config attribute to look.
   * @returns {string}
   */
  public static generateAggregationSubQuery(searchRequest, endPoint, attributes: any, configuration: any): string {
    let rawQuery: string = `select ${_.join(attributes, ",")}`;
    rawQuery += ` from "${endPoint}" where `;
    const conditions: string[] = [];
    for (const key in searchRequest) {
      const mappedAttribute: any = _.find(configuration, { map: key });
      if (mappedAttribute === undefined) {
        continue;
      }
      switch (mappedAttribute.type) {
        case "array":
          conditions.push(`${mappedAttribute.to}`.replace("%arg%", searchRequest[key]));
          break;
        case "string":
          conditions.push(`"${mappedAttribute.to}" = '${searchRequest[key]}'`);
          break;
        case "date":
          searchRequest[key]
            .toString()
            .split(",")
            .forEach((date) => {
              const dateCondition = Utility.getPrefixDate(date);
              conditions.push(`"${mappedAttribute.to}"` + Utility.getOperatorByCondition(dateCondition.prefix) + "'" + dateCondition.date + "'");
            });
          break;
      }
    }
    rawQuery += _.join(conditions, " and ");
    return rawQuery.replace("\\", "");
  }

  /**
   * Generates aggregation query for the component based scenario.
   * @param {any}searchRequest query parameters.
   * @param {object} attributes columns to be fetched.
   * @param {string} subQuery generated subquery from generateAggregationSubQuery.
   * @param {string} alias alias to use for subquery.
   * @param {any} configuration config attribute to look.
   * @param {string[]} groupby columns to be used in group by.
   * @param {string[]} orderby columns to be used in order by.
   * @returns {string}
   */
  public static generateAggregationQuery(
    searchRequest,
    attributes: any,
    subQuery: string,
    alias: string,
    configuration: any,
    groupby: string[],
    orderby: string[]
  ): string {
    let rawQuery: string = `select ${_.join(attributes, ",")}`;
    rawQuery += " from ( " + subQuery + " ) as " + alias;
    const conditions: string[] = [];
    if (_.has(searchRequest, "component-code")) {
      const key: string = "component-code";
      const mappedAttribute: any = _.find(configuration, { map: key });
      conditions.push(`${mappedAttribute.to}`.replace("%arg%", searchRequest[key]));
    }
    if (conditions.length > 0) {
      rawQuery += " where " + _.join(conditions, " and ");
    }
    if (groupby) {
      rawQuery += " group by " + _.join(groupby, ",");
    }
    if (orderby) {
      rawQuery += " order by " + _.join(orderby, ",");
    }
    return rawQuery.replace("\\", "");
  }

  public static async fetchAllDatabaseRows(serviceModel: any, recordIds: string[]) {
    log.info("Inside fetchAllDatabaseRows: ");
    const results = await serviceModel.findAll({
      where: {
        id: {
          [Op.or]: recordIds
        }
      }
    });

    return results;
  }
}

export { AggregationHelperService };
