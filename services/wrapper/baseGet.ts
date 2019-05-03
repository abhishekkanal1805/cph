import * as log from "lambda-log";
import * as _ from "lodash";
import * as moment from "moment";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { CriteriaList } from "../../models/CPH/connection/criteriaList";
import { SharingRule } from "../../models/CPH/connection/sharingRule";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { JsonParser } from "../utilities/jsonParser";
import { QueryGenerator } from "../utilities/queryGenerator";
import { QueryValidator } from "../validators/queryValidator";

export class BaseGet {
  /**
   *
   *
   * @static
   * @param {string} id
   * @param {*} model
   * @param {string} requestorProfileId
   * @param {*} userElement
   * @param {*} patientElement
   * @returns
   * @memberof BaseGet
   */
  public static async getResource(id: string, model, requestorProfileId: string, patientElement) {
    log.info("In BaseGet :: getResource()");
    const options = { where: { id, "meta.isDeleted": false } };
    let record = await DAOService.fetchOne(model, options);
    record = record.dataResource;
    const patientIds = JsonParser.findValuesForKey([record], patientElement, false);
    const patientId = patientIds[0].split(Constants.USERPROFILE_REFERENCE)[1];
    await AuthService.authorizeConnectionBased(requestorProfileId, patientId);
    log.info("getResource() :: Record retrieved successfully");
    return record;
  }

  /**
   * Wrapper function to perform GET for record without authorization
   * @static
   * @param {string} id
   * @param {*} model
   * @param {string} requestorProfileId
   * @param {*} userElement
   * @param {*} patientElement
   * @returns
   * @memberof BaseGet
   */
  public static async getResourceWithoutAuthorization(id: string, model: any) {
    log.info("In BaseGet :: getResourceWithoutAuthorization()");
    const options = { where: { id, "meta.isDeleted": false } };
    let record = await DAOService.fetchOne(model, options);
    record = record.dataResource;
    log.info("getResource() :: Record retrieved successfully");
    return record;
  }

  /** Wrapper function to perform search for CPH users
   * @static
   * @param {*} model Service Model for which search operation will occour
   * @param {*} queryParams Input search request
   * @param {string} resourceOwnerElement Reference key wrt which user validation will occour. example informationSource, to, from etc
   * @param {string} requestorProfileId Profile Id of the logged in user
   * @param {*} attributesMapping Column mapping for queryParams
   * @returns
   * @memberof BaseSearch
   */
  public static async searchResource(
    model: any,
    queryParams: any,
    resourceOwnerElement: string,
    requestorProfileId: string,
    attributesMapping: any,
    attributesToRetrieve?: string[]
  ) {
    // Perform User validation
    let connection;
    if (Constants.RESOURCES_ACCESSIBLE_TO_ALL.includes(model.name)) {
      log.info("Search for resource accessible to all: " + model.name);
      connection = await AuthService.authorizeConnectionBased(requestorProfileId, requestorProfileId);
    } else {
      if (!queryParams[resourceOwnerElement]) {
        log.debug("id is not present in queryParams");
        // If loggedin id is not present in queryParams, then return loggedin user data only
        queryParams[resourceOwnerElement] = [requestorProfileId];
      }
      connection = await AuthService.authorizeConnectionBased(requestorProfileId, queryParams[resourceOwnerElement][0]);
    }
    // if isDeleted attribute not present in query parameter then return active records
    if (!queryParams[Constants.IS_DELETED]) {
      queryParams[Constants.IS_DELETED] = [Constants.IS_DELETED_DEFAULT_VALUE];
    }

    let limit = Constants.FETCH_LIMIT;
    let offset = Constants.DEFAULT_OFFSET;
    // Validate limit parameter
    if (queryParams.limit) {
      limit = _.toNumber(queryParams.limit[0]);
      if (_.isNaN(limit) || !_.isInteger(limit) || limit < 1 || limit > Constants.FETCH_LIMIT) {
        log.info("limit in request is not valid " + queryParams.limit[0]);
        throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + Constants.LIMIT);
      }
      // delete limit attibute as it is not part of search attribute
      delete queryParams.limit;
    }
    // Validate offset parameter
    if (queryParams.offset) {
      offset = _.toNumber(queryParams.offset[0]);
      if (_.isNaN(offset) || offset < 0 || !_.isInteger(offset)) {
        log.info("offset in request is not valid " + queryParams.offset[0]);
        throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + Constants.OFFSET);
      }
      // delete offset attibute as it is not part of search attribute
      delete queryParams.offset;
    }
    // Validate query parameter data type and value
    QueryValidator.validateQueryParams(queryParams, attributesMapping);
    // Generate Search Query based on query parameter & config settings
    const queryObject: any = QueryGenerator.getFilterCondition(queryParams, attributesMapping);
    log.info(">>>" + JSON.stringify(connection));
    log.info("BEFORE" + (new Date().toISOString()));
    const whereClause: any = await BaseGet.addSharingRuleClause(queryObject, connection[0], queryParams[resourceOwnerElement], model);
    log.info("AFTER" + (new Date().toISOString()));
    // fetch data from db with all conditions
    const searchQuery = {
      where: whereClause,
      attributes: attributesToRetrieve && attributesToRetrieve.length > 0 ? attributesToRetrieve : [Constants.DEFAULT_SEARCH_ATTRIBUTES],
      limit: limit + 1,
      offset,
      order: Constants.DEFAULT_ORDER_BY
    };
    let result: any = await DAOService.search(model, searchQuery);
    result =
      attributesToRetrieve && attributesToRetrieve.length > 0 && attributesToRetrieve !== [Constants.DEFAULT_SEARCH_ATTRIBUTES]
        ? result
        : _.map(result, Constants.DEFAULT_SEARCH_ATTRIBUTES).filter(Boolean);
    // Add offset and limit to generate next url
    queryParams.limit = limit;
    queryParams.offset = offset;
    return result;
  }

  /**
   * @param queryObject
   * @param connection
   * @param isSharingRuleCheckNeeded
   * @param model
   * @return {Promise<{}>}
   */
  /* TODO: This Function will be moved to Utility class */
  public static async addSharingRuleClause(queryObject, connection, isSharingRuleCheckNeeded, model) {
    log.info("Entering BaseGet :: addSharingRuleClauseToWhere()");
    let whereClause = {};
    const serviceName = model.getTableName();
    if (isSharingRuleCheckNeeded) {
      if (connection && !connection.sharingRules && connection.sharingRules.length === 0) {
        if (serviceName === "Connection") {
          whereClause = queryObject;
        }
      } else {
        const sharingRuleConditionClause: any = await BaseGet.getSharingRulesConditionClause(connection.sharingRules, serviceName);
        const andCondition = [];
        andCondition.push(queryObject);
        andCondition.push(sharingRuleConditionClause);
        whereClause[Op.and] = andCondition;
      }
    } else {
      whereClause = queryObject;
    }
    log.info("Exiting BaseGet :: addSharingRuleClauseToWhere()");
    return whereClause;
  }

  /**
   * @param {SharingRule[]} sharingRules
   * @param {string} serviceName
   * @return {Promise<any>}
   */
  public static async getSharingRulesConditionClause(sharingRules: SharingRule[], serviceName: string) {
    log.info("Entering BaseService :: getSharingRulesConditionClause()");
    let conditionClause: any = {};
    if (sharingRules && sharingRules.length > 0) {
      for (const sharingRule of sharingRules) { // TODO: all sharing rules should be ORed
        if (sharingRule.resourceType.toLowerCase() ===  serviceName.toLowerCase() && sharingRule.criteriaList) {
          conditionClause = await BaseGet.getCriteriaConditionClause(sharingRule.criteriaList);
        }
      }
    } else {
      log.info("SharingRules for the connection are undefined or empty");
    }
    log.info("Exiting  BaseService :: getSharingRulesConditionClause()");
    return conditionClause;
  }

  /**
   * @param {CriteriaList} criteriaList
   * @return {Promise<void>}
   */
  public static async getCriteriaConditionClause(criteriaList: CriteriaList) {
    log.info("Entering BaseService :: getCriteriaCondition()");
    const operationMap = {
      ANY: Op.or,
      ALL: Op.and
    };
    const operation = operationMap[criteriaList.type];
    const conditionArray = {};
    conditionArray[operation] = [];
    if (criteriaList.criteria && criteriaList.criteria.length > 0) {
      for (const criterion of criteriaList.criteria) {
        const criterionCondition = await BaseGet.generateConditionClause(criterion);
        conditionArray[operation].push(criterionCondition);
      }
    }
    if (criteriaList.criteriaList) {
      const criteriaListConditions: any = await BaseGet.getCriteriaConditionClause(criteriaList.criteriaList);
      conditionArray[operation].push(criteriaListConditions);
    }
    log.info("Exiting BaseService :: getCriteriaCondition()");
    return conditionArray;
  }

  /**
   * @param criterion
   * @return {Promise<{}>}
   */
  public static async generateConditionClause(criterion) {
    log.info("Entering BaseService :: generateConditionClause()");
    const operationMap = {
      greaterThan: Op.gt,
      greaterThanOrEqual: Op.gte,
      lessThan: Op.lt,
      lessThanOrEqual: Op.lte,
      equal: Op.eq
    };
    const criteriaClause = {};
    const value = criterion.value ? criterion.value : await BaseGet.expressionEvaluator(criterion.valueExpression);
    const operation = operationMap[criterion.operation];
    log.info("Exiting BaseService :: generateConditionClause()");
    return criteriaClause[criterion.field] = {
      [operation]:  value
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
