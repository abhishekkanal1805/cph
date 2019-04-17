import * as log from "lambda-log";
import * as _ from "lodash";
import { Constants } from "../../common/constants/constants";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
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
    const patientId = patientIds[0];
    log.info("getResource() :: Authorization started");
    const requestorUserProfile = await DataFetch.getUserProfile(requestorProfileId);
    requestorUserProfile.profileId = Constants.USERPROFILE_REFERENCE + requestorUserProfile.profileId;
    log.info("UserProfile information retrieved successfully :: saveRecord()");
    await AuthService.hasConnectionBasedAccess(requestorUserProfile.profileId, requestorUserProfile.profileType, patientId);
    log.info("getResource() :: Record retrieved successfully");
    return record;
  }

  /**
   *  Wrapper function to perform search for CPH users
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
    // If loggedin id is not present in queryParams, then return loggedin user data only
    if (!queryParams[patientElement]) {
      log.debug("id is not present in queryParams");
      queryParams[patientElement] = [requestorProfileId];
    } else {
      await AuthService.hasConnectionBasedAccess(requestorProfileId, queryParams[patientElement]);
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
    // fetch data from db with all conditions
    const searchQuery = {
      where: queryObject,
      attributes: [Constants.DEFAULT_SEARCH_ATTRIBUTES],
      limit: limit + 1,
      offset,
      order: Constants.DEFAULT_ORDER_BY
    };
    let result: any = await DAOService.search(model, searchQuery);
    result = _.map(result, Constants.DEFAULT_SEARCH_ATTRIBUTES);
    // Add offset and limit to generate next url
    queryParams.limit = limit;
    queryParams.offset = offset;
    return result;
  }
}
