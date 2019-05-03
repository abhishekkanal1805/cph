import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { DataService } from "../common/dataService";
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
    const options = { "meta.isDeleted": false };
    let record = await DAOService.fetchRowByPkQuery(id, model, options);
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
    const options = { "meta.isDeleted": false };
    let record = await DAOService.fetchRowByPkQuery(id, model, options);
    record = record.dataResource;
    log.info("getResource() :: Record retrieved successfully");
    return record;
  }
  /** Wrapper function to perform search for CPH users
   * @static
   * @param {*} model Service Model for which search operation will occour
   * @param {*} queryParams Input search request
   * @param {string} patientElement Reference key wrt which user validation will occour
   * @param {string} requestorProfileId Profile Id of the logged in user
   * @param {*} attributesMapping Column mapping for queryParams
   * @returns
   * @memberof BaseSearch
   */
  public static async searchResource(model: any, queryParams: any, patientElement: string, requestorProfileId: string, attributesMapping: any) {
    // Perform User validation
    let connection;
    // If loggedin id is not present in queryParams, then return loggedin user data only
    if (!queryParams[patientElement]) {
      log.debug("id is not present in queryParams");
      queryParams[patientElement] = [requestorProfileId];
    } else {
      connection = await AuthService.authorizeConnectionBased(requestorProfileId, queryParams[patientElement][0]);
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
        log.info("limit in request is not valid hence default limit was used " + queryParams.limit[0]);
      }
      // delete limit attibute as it is not part of search attribute
      delete queryParams.limit;
    }
    // Validate offset parameter
    if (queryParams.offset) {
      offset = _.toNumber(queryParams.offset[0]);
      if (_.isNaN(offset) || offset < 0 || !_.isInteger(offset)) {
        log.info("offset in request is not valid hence default offset was used " + queryParams.offset[0]);
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
    const whereClause: any = await BaseGet.addSharingRuleClause(queryObject, connection[0], queryParams[patientElement], model);
    log.info("AFTER" + (new Date().toISOString()));
    // fetch data from db with all conditions
    const searchQuery = {
      where: whereClause,
      attributes: [Constants.DEFAULT_SEARCH_ATTRIBUTES],
      limit: limit + 1,
      offset,
      order: Constants.DEFAULT_ORDER_BY
    };
    let result: any = await DAOService.search(model, searchQuery);
    result = _.map(result, Constants.DEFAULT_SEARCH_ATTRIBUTES).filter(Boolean);
    // Add offset and limit to generate next url
    queryParams.limit = limit;
    queryParams.offset = offset;
    return result;
  }

  /** Wrapper function to perform search for CPH users
   * @static
   * @param {*} model Service Model for which search operation will occour
   * @param {*} queryParams Input search request
   * @param {string} patientElement Reference key wrt which user validation will occour
   * @param {string} requestorProfileId Profile Id of the logged in user
   * @param {*} attributesMapping Column mapping for queryParams
   * @returns
   * @memberof BaseSearch
   */
  public static async searchSpecificAttributes(model: any, queryParams: any, attributesMapping: any, attributesToRetrieve: string[]) {
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
        log.info("limit in request is not valid hence default limit was used " + queryParams.limit[0]);
      }
      // delete limit attibute as it is not part of search attribute
      delete queryParams.limit;
    }
    // Validate offset parameter
    if (queryParams.offset) {
      offset = _.toNumber(queryParams.offset[0]);
      if (_.isNaN(offset) || offset < 0 || !_.isInteger(offset)) {
        log.info("offset in request is not valid hence default offset was used " + queryParams.offset[0]);
      }
      // delete offset attibute as it is not part of search attribute
      delete queryParams.offset;
    }
    // Validate query parameter data type and value
    QueryValidator.validateQueryParams(queryParams, attributesMapping);
    // Generate Search Query based on query parameter & config settings
    const queryObject: any = QueryGenerator.getFilterCondition(queryParams, attributesMapping);
    if (attributesToRetrieve.length == 0) {
      attributesToRetrieve = [Constants.DEFAULT_SEARCH_ATTRIBUTES];
    }
    // fetch data from db with all conditions
    const searchQuery = {
      where: queryObject,
      attributes: attributesToRetrieve,
      limit: limit + 1,
      offset,
      order: Constants.DEFAULT_ORDER_BY
    };
    let result: any = await DAOService.search(model, searchQuery);
    result = _.map(result, Constants.DEFAULT_SEARCH_ATTRIBUTES).filter(Boolean);
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
        const sharingRuleConditionClause: any = await DataService.getSharingRulesConditionClause(connection.sharingRules, serviceName);
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
}
