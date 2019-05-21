import * as log from "lambda-log";
import * as moment from "moment";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { ConnectionDataResource } from "../../models/CPH/connection/connectionDataResource";
import { SharingRule } from "../../models/CPH/connection/sharingRule";
import { QueryGenerator } from "./queryGenerator";

export class SharingRulesHelper {
  /**
   * This function takes queryObject (generated by calling function for queryParams) and
   * connection object and appends sharingRule sequelize query clause with queryObject if
   * applicable otherwise returns queryObject as whereClause or return empty object.
   *
   * @param queryObject
   * @param {ConnectionDataResource} connection
   * @param model
   * @param {string} accessLevel
   * @return {{}}
   */
  public static addSharingRuleClause(
    queryObject: any,
    connection: ConnectionDataResource,
    model: any,
    accessLevel: string,
    isSharingRuleCheckRequired: boolean
  ) {
    log.info("Entering SharingRulesHelper :: addSharingRuleClause()");
    let whereClause = {};
    const serviceName = model.getTableName();
    if (!isSharingRuleCheckRequired) {
      // In case loggedIn user is searching for his/her own resource then SharingRule query clause not required.
      whereClause = queryObject;
    } else if (connection && connection.sharingRules && connection.sharingRules.length > 0) {
      /*
       * If SharingRules are present in connection then sharingRuleConditionClause is generated and
       * appended to the queryObject with logical AND operation.
       */
      const sharingRuleConditionClause: any = SharingRulesHelper.getSharingRulesClause(connection.sharingRules, serviceName, accessLevel);
      const andCondition = [];
      andCondition.push(queryObject);
      andCondition.push(sharingRuleConditionClause);
      whereClause[Op.and] = andCondition;
    }
    log.info("Exiting SharingRulesHelper :: addSharingRuleClause()");
    return whereClause;
  }

  /**
   * This function takes sharingRule array and iterate over that array and calls getCriteriaClause
   * to generate the sequelize query clauses.
   * All sharingRules are by default connected with each other with logical OR operation.
   * AccessLevel defines which sharingRule is applicable for the called endpoint.
   *
   * @param {SharingRule[]} sharingRules
   * @param {string} serviceName
   * @param {string} accessLevel
   * @return {{}}
   */
  public static getSharingRulesClause(sharingRules: SharingRule[], serviceName: string, accessLevel: string) {
    log.info("Entering SharingRulesHelper :: getSharingRulesClause()");
    const sharingRuleClause = {};
    sharingRuleClause[Op.or] = [];
    for (const sharingRule of sharingRules) {
      if (
        sharingRule.resourceType.toLowerCase() === serviceName.toLowerCase() &&
        sharingRule.accessLevel.toLowerCase() === accessLevel &&
        sharingRule.criteria
      ) {
        const operator = sharingRule.operator ? sharingRule.operator : Constants.OPERATION_OR;
        // Below line of code gets all the query clause for all criteria inside SharingRule.
        const criteria = SharingRulesHelper.getCriteriaClause(sharingRule.criteria, operator);
        sharingRuleClause[Op.or].push(criteria);
      }
    }
    log.info("Exiting  SharingRulesHelper :: getSharingRulesClause()");
    return sharingRuleClause;
  }

  /**
   * This function takes criteria array converts it into a sequelize query clause.
   * It also calls itself recursively to generate query clause if there is any
   * nested criteria present.
   * Function implementation is mainly split into to blocks on takes care of single
   * criteria types and other takes care of group type.
   *
   * @param {any[]} criteria
   * @param {string} operator
   * @return {{}}
   */
  public static getCriteriaClause(criteria: any[], operator: string) {
    const operationMap = {
      greaterThan: [Op.gt, "gt"],
      greaterThanOrEqual: [Op.gte, "ge"],
      lessThan: [Op.lt, "lt"],
      lessThanOrEqual: [Op.lte, "le"],
      equal: [Op.eq, ""],
      notEqual: [Op.ne, ""]
    };
    const operatorMap = { OR: Op.or, AND: Op.and };
    /*
     * If operator is mentioned inside sharingRule object and sent to this function then that
     * operator is used as logical operator between all the primary criteria otherwise OR is considered
     */
    operator = operator ? operatorMap[operator] : operatorMap[Constants.OPERATION_OR];
    const conditionArray = {};
    conditionArray[operator] = [];
    for (const criterion of criteria) {
      if (criterion.type === Constants.TYPE_SINGLE) {
        conditionArray[operator].push(SharingRulesHelper.generateConditionForSingleCriteria(criterion, operationMap));
      } else {
        // All the criteria with type "group" are taken care in this block with recursive calls..
        const criteriaGroupConditions: any = SharingRulesHelper.getCriteriaClause(criterion.criteria, criterion.operator);
        conditionArray[operator].push(criteriaGroupConditions);
      }
    }
    return conditionArray;
  }

  /**
   * Generates criteria condition for criteria of single type.
   * @param criterion
   * @param operationMap
   * @return {{}}
   */
  public static generateConditionForSingleCriteria(criterion: any, operationMap) {
    const datePattern =
      "^-?[0-9]{4}(-(0[1-9]|1[0-2])(-(0[0-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\\\.[0-9]+)?(Z|(\\\\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?$";
    // All the criteria with type "single" are taken care in this block.
    let value = criterion.value ? criterion.value : SharingRulesHelper.expressionEvaluator(criterion.valueExpression.expression);
    let operation = operationMap[criterion.operation][0];
    if (value.match(datePattern) && criterion.operation !== "notEqual") {
      // This block takes care of generating Date type conditions where year, year-month etc formats considered.
      const dateCondition = {};
      const column = { columnHierarchy: criterion.element };
      QueryGenerator.createDateSearchConditions(column, [operationMap[criterion.operation][1] + value], dateCondition);
      return dateCondition;
    } else {
      const attributes = criterion.element.split(Constants.DOT_VALUE);
      let parentAttribute = criterion.element;
      const arrFlag = attributes[0].indexOf(Constants.ARRAY_SEARCH_SYMBOL) > -1;
      operation = (arrFlag) ? Op.contains : operation;
      if (arrFlag) {
        parentAttribute = attributes[0].replace(Constants.ARRAY_SEARCH_SYMBOL, Constants.EMPTY_VALUE);
        if (attributes.length == 1) {
          value = [value];
        } else {
          const nestedAttributes = {};
          QueryGenerator.getNestedAttributes(attributes.slice(1), value, nestedAttributes, false);
          value = [nestedAttributes];
        }
      }
      return {
        [parentAttribute]: {
          [operation]: value
        }
      };
    }
  }

  /**
   * This function takes a predefined date expression comes from Sharing Rule valueExpression
   * and convert it into a valid date string.
   *
   * @param {string} expression : expression to be eveluated
   * @returns {string}
   */
  public static expressionEvaluator(expression: string) {
    const days: string[] = Constants.DAYS_IN_WEEK;
    const months: string[] = Constants.MONTHS_IN_YEAR;
    const init: number = expression.indexOf(Constants.OPENING_PARENTHESES);
    const fin: number = expression.indexOf(Constants.CLOSING_PARENTHESES);
    const value: string = expression.substr(init + 1, fin - init - 1);
    let evaluatedValue: string;
    if (days.indexOf(value) > -1) {
      evaluatedValue = moment()
        .weekday(days.indexOf(value) - 6)
        .format(Constants.DATE);
    } else if (months.indexOf(value) > -1) {
      const month = months.indexOf(value);
      const lastDate: number = moment()
        .month(month)
        .daysInMonth();
      evaluatedValue = moment().year() + Constants.HYPHEN + (month < 9 ? "0" + (month + 1) : Constants.EMPTY_VALUE + (month + 1)) + Constants.HYPHEN + lastDate;
    } else {
      evaluatedValue = value + Constants.HYPHEN + "12" + Constants.HYPHEN + "31";
    }
    return evaluatedValue;
  }
}
