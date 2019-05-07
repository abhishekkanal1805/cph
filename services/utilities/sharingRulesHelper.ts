import * as log from "lambda-log";
import * as moment from "moment";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { SharingRule } from "../../models/CPH/connection/sharingRule";

export class SharingRulesHelper {

  /**
   * @param queryObject
   * @param connection
   * @param isSharingRuleCheckNeeded
   * @param model
   * @return {Promise<{}>}
   */
  public static async addSharingRuleClause(queryObject, connection, model) {
    log.info("Entering SharingRulesHelper :: addSharingRuleClause()");
    let whereClause = {};
    const serviceName = model.getTableName();
    if (connection !== {}) {
      if (!connection.sharingRules || connection.sharingRules.length === 0) {
        if (serviceName === Constants.CONNECTION_SERVICE) {
          whereClause = queryObject;
        }
      } else {
        const sharingRuleConditionClause: any = await SharingRulesHelper.getSharingRulesClause(connection.sharingRules, serviceName);
        const andCondition = [];
        andCondition.push(queryObject);
        andCondition.push(sharingRuleConditionClause);
        whereClause[Op.and] = andCondition;
      }
    } else {
      whereClause = queryObject;
    }
    log.info("Exiting SharingRulesHelper :: addSharingRuleClause()");
    return whereClause;
  }

  /**
   * @param {SharingRule[]} sharingRules
   * @param {string} serviceName
   * @return {Promise<any>}
   */
  public static async getSharingRulesClause(sharingRules: SharingRule[], serviceName: string) {
    log.info("Entering SharingRulesHelper :: getSharingRulesClause()");
    const criteriaClause = {};
    criteriaClause[Op.or] = [];
    for (const sharingRule of sharingRules) { // TODO: all sharing rules should be ORed. ORing code is yet to be added
      if (sharingRule.resourceType.toLowerCase() ===  serviceName.toLowerCase() && sharingRule.criteria) {
        const criteria = await SharingRulesHelper.getCriteriaClause(sharingRule.criteria);
        criteriaClause[Op.or].push(criteria);
      }
    }
    log.info("Exiting  SharingRulesHelper :: getSharingRulesClause()");
    return criteriaClause;
  }

  /**
   * @param {Array<CriteriaGroup | CriteriaValue | CriteriaExpression>} criteria
   * @param operation
   * @return {Promise<{}>}
   */
  public static async getCriteriaClause(criteria, operation?) {
    const operationMap = {
      OR: Op.or,
      AND: Op.and
    };
    if (!operation) {
      operation = operationMap[Constants.OPERATION_OR];
    } else {
      operation = operationMap[operation];
    }
    const conditionArray = {};
    conditionArray[operation] = [];
    for (const criterion of criteria) {
      if (criterion.type === Constants.TYPE_SINGLE) {
        const criterionCondition = await SharingRulesHelper.generateCriteriaClause(criterion);
        conditionArray[operation].push(criterionCondition);
      } else {
        const criteriaGroupConditions: any = await SharingRulesHelper.getCriteriaClause(criterion.criteria, criterion.operator);
        conditionArray[operation].push(criteriaGroupConditions);
      }
    }
    return conditionArray;
  }

  /**
   * @param criterion
   * @return {Promise<{}>}
   */
  public static async generateCriteriaClause(criterion) {
    /*const column = {columnHierarchy: criterion.element};*/
    const operationMap = {
      greaterThan: Op.gt,
      greaterThanOrEqual: Op.gte,
      lessThan: Op.lt,
      lessThanOrEqual: Op.lte,
      equal: Op.eq
    };
    const value = criterion.value ? criterion.value : await SharingRulesHelper.expressionEvaluator(criterion.valueExpression);
    const operation = operationMap[criterion.operation];
    return {
      [criterion.element]: {
        [operation]:  value
      }
    };
  }

  /**
   * This function takes a predefiend date expression comes from Sharing Rule valueExpression
   * and convert it into a valid date string.
   * @param {string} expression : expression to be eveluated
   * @returns {string}
   */
  public static async expressionEvaluator(expression: string) {
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
