import * as log from "lambda-log";
import * as _ from "lodash";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { JsonParser } from "../utilities/jsonParser";
import { QueryGenerator } from "../utilities/queryGenerator";
import { SharingRulesHelper } from "../utilities/sharingRulesHelper";
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
    let isSharingRuleClauseNeeded = true;
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
        isSharingRuleClauseNeeded = false;
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
    log.info(">>>" + JSON.stringify(connection)); /* TODO: To be removed */
    log.info("BEFORE" + (new Date().toISOString())); /* TODO: To be removed */
    const whereClause: any = await SharingRulesHelper.addSharingRuleClause(queryObject, connection[0], isSharingRuleClauseNeeded, model);
    log.info("AFTER" + (new Date().toISOString())); /* TODO: To be removed */
    if (whereClause === {}) {
      return [];
    }
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
}
