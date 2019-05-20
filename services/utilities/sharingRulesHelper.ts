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
  public static addSharingRuleClause(queryObject, connection, model, accessLevel) {
    log.info("Entering SharingRulesHelper :: addSharingRuleClause()");
    let whereClause = {};
    const serviceName = model.getTableName();
    if (connection) {
      if (!connection.sharingRules || connection.sharingRules.length === 0) {
        if (serviceName === Constants.CONNECTION_SERVICE) {
          whereClause = queryObject;
        }
      } else {
        const sharingRuleConditionClause: any = SharingRulesHelper.getSharingRulesClause(connection.sharingRules, serviceName, accessLevel);
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
  public static getSharingRulesClause(sharingRules: SharingRule[], serviceName: string, accessLevel: string) {
    log.info("Entering SharingRulesHelper :: getSharingRulesClause()");
    const sharingRuleClause = {};
    sharingRules[Op.or] = [];
    for (const sharingRule of sharingRules) {
      if (sharingRule.resourceType.toLowerCase() === serviceName.toLowerCase() && sharingRule.accessLevel.toLowerCase() === accessLevel && sharingRule.criteria) {
        const criteria = SharingRulesHelper.getCriteriaClause(sharingRule.criteria);
        sharingRuleClause[Op.or].push(criteria);
      }
    }
    log.info("Exiting  SharingRulesHelper :: getSharingRulesClause()");
    return sharingRuleClause;
  }

  /**
   * @param {Array<CriteriaGroup | CriteriaValue | CriteriaExpression>} criteria
   * @param operation
   * @return {Promise<{}>}
   */
  public static getCriteriaClause(criteria, operator?) {
    const operationMap = {
      greaterThan: Op.gt,
      greaterThanOrEqual: Op.gte,
      lessThan: Op.lt,
      lessThanOrEqual: Op.lte,
      equal: Op.eq,
      notEqual: Op.ne
    };
    const operatorMap = { OR: Op.or, AND: Op.and };
    operator = operator ? operatorMap[operator] : operatorMap[Constants.OPERATION_OR];
    const conditionArray = {};
    conditionArray[operator] = [];
    for (const criterion of criteria) {
      if (criterion.type === Constants.TYPE_SINGLE) {
        const value = criterion.value ? criterion.value : SharingRulesHelper.expressionEvaluator(criterion.valueExpression.expression);
        const operation = operationMap[criterion.operation];
        conditionArray[operator].push({
          [criterion.element]: {
            [operation]: value
          }
        });
      } else {
        const criteriaGroupConditions: any = SharingRulesHelper.getCriteriaClause(criterion.criteria, criterion.operator);
        conditionArray[operator].push(criteriaGroupConditions);
      }
    }
    return conditionArray;
  }

  /**
   * This function takes a predefiend date expression comes from Sharing Rule valueExpression
   * and convert it into a valid date string.
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
