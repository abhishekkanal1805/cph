import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ResourceCategory } from "../../common/constants/resourceCategory";
import { BadRequestResult, ForbiddenResult } from "../../common/objects/custom-errors";
import { GetOptions, SearchOptions } from "../../common/types/optionsAttribute";
import { DAOService } from "../dao/daoService";
import { I18N } from "../i18n/i18n";
import { AuthService } from "../security/authService";
import { JsonParser } from "../utilities/jsonParser";
import { QueryGenerator } from "../utilities/queryGenerator";
import { SharingRulesHelper } from "../utilities/sharingRulesHelper";
import { QueryValidator } from "../validators/queryValidator";

export class BaseGet {
  /**
   * Function to retrieve record by Id.
   * Sharing rules and Authorization is performed only for Non-Definitions resources.
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
  public static async getResource(id: string, model, requestorProfileId: string, patientElement?: string, getOptions?: GetOptions) {
    log.info("In BaseGet :: getResource()");
    const queryObject = { id, "meta.isDeleted": false };
    const options = { where: queryObject };
    let record = await DAOService.fetchOne(model, options);
    record = record.dataResource;

    if (!model.resourceCategory || model.resourceCategory !== ResourceCategory.DEFINITION) {
      const patientIds = JsonParser.findValuesForKey([record], patientElement, false);
      const patientId = patientIds[0].split(Constants.USERPROFILE_REFERENCE)[1];
      const connection = await AuthService.authorizeConnectionBasedSharingRules(requestorProfileId, patientId);
      // For system user/ loggedin user to get his own record we won't add sharing rules
      if (connection.length > 0) {
        const whereClause = SharingRulesHelper.addSharingRuleClause(queryObject, connection[0], model, Constants.ACCESS_READ);
        if (_.isEmpty(whereClause[Op.and])) {
          log.info("Sharing rules not present for requested user");
          throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
        }
        record = await DAOService.fetchOne(model, { where: whereClause });
        record = record.dataResource;
      }
    }
    // Translate Resource based on accept language
    const acceptLanguage = getOptions && getOptions.acceptLanguage;
    if (!acceptLanguage) {
      log.info("Translation option not present");
      return record;
    }
    const translatedRecord = I18N.translateResource(record, acceptLanguage);
    log.info("getResource() :: Record retrieved successfully");
    return translatedRecord;
  }

  /**
   * @deprecated use getResource instead.
   * @param {string} id
   * @param {*} model
   * @param {string} requestorProfileId
   * @param {string} patientElement
   * @param {GetOptions} getOptions
   */
  public static async getResourceWithoutSharingRules(id: string, model, requestorProfileId: string, patientElement: string, getOptions?: GetOptions) {
    log.info("In BaseGet :: getResourceWithoutSharingRules()");
    const options = { where: { id, "meta.isDeleted": false } };
    let record = await DAOService.fetchOne(model, options);
    record = record.dataResource;
    const patientIds = JsonParser.findValuesForKey([record], patientElement, false);
    const patientId = patientIds[0].split(Constants.USERPROFILE_REFERENCE)[1];
    await AuthService.authorizeConnectionBased(requestorProfileId, patientId);
    log.info("getResourceWithoutSharingRules() :: Record retrieved successfully");
    // Translate Resource based on accept language
    const acceptLanguage = getOptions && getOptions.acceptLanguage;
    if (!acceptLanguage) {
      log.info("Translation option not present");
      return record;
    }
    const translatedRecord = I18N.translateResource(record, acceptLanguage);
    log.info("getResource() :: Record retrieved successfully");
    return translatedRecord;
  }

  /**
   * Wrapper function to perform GET for record without authorization
   * @deprecated use getResource instead.
   * @static
   * @param {string} id
   * @param {*} model
   * @param {string} requestorProfileId
   * @param {*} userElement
   * @param {*} patientElement
   * @returns
   * @memberof BaseGet
   */
  public static async getResourceWithoutAuthorization(id: string, model: any, getOptions?: GetOptions) {
    log.info("In BaseGet :: getResourceWithoutAuthorization()");
    const options = { where: { id, "meta.isDeleted": false } };
    let record = await DAOService.fetchOne(model, options);
    record = record.dataResource;
    log.info("getResource() :: Record retrieved successfully");
    // Translate Resource based on accept language
    const acceptLanguage = getOptions && getOptions.acceptLanguage;
    if (!acceptLanguage) {
      log.info("Translation option not present");
      return record;
    }
    const translatedRecord = I18N.translateResource(record, acceptLanguage);
    log.info("getResource() :: Record retrieved successfully");
    return translatedRecord;
  }

  /** Wrapper function to perform search for CPH resources
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
    attributesToRetrieve?: string[],
    searchOptions?: SearchOptions
  ) {
    // Perform User validation
    let connection;
    let isSharingRuleCheckRequired: boolean = true;
    // TODO: move RESOURCES_ACCESSIBLE_TO_ALL to model parameter based
    if (model.resourceCategory && model.resourceCategory === ResourceCategory.DEFINITION) {
      log.info("Search for resource accessible to all: " + model.name);
      isSharingRuleCheckRequired = false;
    } else {
      if (!queryParams[resourceOwnerElement]) {
        log.debug("id is not present in queryParams");
        // If loggedin id is not present in queryParams, then return loggedin user data only
        queryParams[resourceOwnerElement] = [requestorProfileId];
        isSharingRuleCheckRequired = false;
      }
      connection = await AuthService.authorizeConnectionBasedSharingRules(requestorProfileId, queryParams[resourceOwnerElement][0]);
      // For system user/ loggedin user to get his own record we won't add sharing rules
      isSharingRuleCheckRequired = connection.length > 0;
    }
    // if isDeleted attribute not present in query parameter then return active records
    if (!queryParams[Constants.IS_DELETED]) {
      queryParams[Constants.IS_DELETED] = [Constants.IS_DELETED_DEFAULT_VALUE];
    }

    let fetchLimit = searchOptions && searchOptions.hasOwnProperty("fetchLimit") ? searchOptions.fetchLimit : Constants.FETCH_LIMIT;
    let offset = Constants.DEFAULT_OFFSET;
    // Validate limit parameter
    if (queryParams.hasOwnProperty("limit")) {
      const limit = _.toNumber(queryParams.limit[0]);
      if (_.isNaN(limit) || !_.isInteger(limit) || limit < 1 || limit > fetchLimit) {
        log.info("limit in request is not valid " + queryParams.limit[0]);
        throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + Constants.LIMIT);
      }
      // delete limit attibute as it is not part of search attribute
      fetchLimit = limit;
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
    let whereClause: any;
    const queryObject: any = QueryGenerator.getFilterCondition(queryParams, attributesMapping);
    /*
     * Below line of code calls SharingRuleHelper class function to generate
     * and append SharingRule query clause along with queryObject
     */
    log.info("status of isSharingRuleCheckRequired: " + isSharingRuleCheckRequired);
    whereClause = isSharingRuleCheckRequired ? SharingRulesHelper.addSharingRuleClause(queryObject, connection[0], model, Constants.ACCESS_READ) : queryObject;
    if (isSharingRuleCheckRequired && _.isEmpty(whereClause[Op.and])) {
      log.info("Sharing rules not present for requested user");
      return [];
    }
    // fetch data from db with all conditions
    const searchQuery = {
      where: whereClause,
      attributes: attributesToRetrieve && attributesToRetrieve.length > 0 ? attributesToRetrieve : [Constants.DEFAULT_SEARCH_ATTRIBUTES],
      limit: fetchLimit + 1,
      offset,
      order: Constants.DEFAULT_ORDER_BY
    };
    let result: any = await DAOService.search(model, searchQuery);
    result =
      attributesToRetrieve && attributesToRetrieve.length > 0 && attributesToRetrieve.indexOf(Constants.DEFAULT_SEARCH_ATTRIBUTES) == -1
        ? result
        : _.map(result, Constants.DEFAULT_SEARCH_ATTRIBUTES).filter(Boolean);
    // Add offset and limit to generate next url
    queryParams.limit = fetchLimit;
    queryParams.offset = offset;
    // Translate Resource based on accept language
    const acceptLanguage = searchOptions && searchOptions.acceptLanguage;
    if (!acceptLanguage) {
      log.info("Translation option not present");
      return result;
    }
    const translatedRecords = [];
    log.info("TranslateResource Started");
    result.forEach((eachResource: any) => {
      const translatedRecord = I18N.translateResource(eachResource, acceptLanguage);
      translatedRecords.push(translatedRecord);
    });
    log.info("TranslateResource Complete");
    return translatedRecords;
  }
}
