/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ResourceCategory } from "../../common/constants/resourceCategory";
import { GetOptions, SearchOptions } from "../../common/interfaces/baseInterfaces";
import { BadRequestResult, ForbiddenResult } from "../../common/objects/custom-errors";
import { tableNameToResourceTypeMapping } from "../../common/objects/tableNameToResourceTypeMapping";
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
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    if (!model.resourceCategory || model.resourceCategory !== ResourceCategory.DEFINITION) {
      const patientIds = JsonParser.findValuesForKey([record], patientElement, false);
      const connection = await AuthService.authorizeConnectionBasedSharingRules({
        requester: requestorProfileId,
        ownerReference: patientIds[0],
        resourceType: serviceName,
        accessType: Constants.ACCESS_READ,
        resourceActions: getOptions ? getOptions.resourceActions : null
      });
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
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    await AuthService.authorizeConnectionBased(requestorProfileId, patientIds[0], serviceName, Constants.ACCESS_READ);
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
    let connections = [];
    let isSharingRuleCheckRequired: boolean = true;
    const filteredQueryParameter = {};

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
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    const isResoucePublicAccessable: boolean = await AuthService.getResourceAccessLevel(serviceName, Constants.ACCESS_READ);
    if (isResoucePublicAccessable) {
      log.info("Read is allowed as resource type");
      isSharingRuleCheckRequired = false;
    } else if (resourceOwnerElement) {
      if (_.isEmpty(queryParams) || !queryParams[resourceOwnerElement]) {
        log.info("queryParams is empty or resourceOwnerElement not present");
        queryParams[resourceOwnerElement] = [requestorProfileId];
        isSharingRuleCheckRequired = false;
      }
      let requestedProfiles =
        queryParams[resourceOwnerElement].length == 1 ? queryParams[resourceOwnerElement][0].split(Constants.COMMA_VALUE) : queryParams[resourceOwnerElement];
      requestedProfiles = _.map(requestedProfiles, (eachProfile: any) => {
        return eachProfile.indexOf(Constants.FORWARD_SLASH) == -1 ? [Constants.USER_PROFILE, eachProfile].join(Constants.FORWARD_SLASH) : eachProfile;
      });
      log.info("requestedProfiles = " + JSON.stringify(requestedProfiles));
      // requestedProfiles now contains ResearchSubject references and UserProfile references
      // make sure requestedProfiles contains the subjects not profiles
      const authResponse = await AuthService.authorizeMultipleConnectionsBased(
        requestorProfileId,
        requestedProfiles,
        serviceName,
        Constants.ACCESS_READ,
        searchOptions ? searchOptions.resourceActions : null
      );
      connections = authResponse.authorizedConnections;
      // authResponse.authorizedRequestees are the references that require no sharing rule check
      if (!_.isEmpty(authResponse.authorizedRequestees)) {
        // access to all the references in filteredQueryParameter will be given unconditionally
        filteredQueryParameter[resourceOwnerElement] = [authResponse.authorizedRequestees.join(Constants.COMMA_VALUE)].filter(Boolean);
      }

      // if fullAuthGranted dont filter the subjects. full search access was granted to all
      // else if authorizedRequestees, fullAccess is granted with no sharingRules check to these references
      // if connections were also returned means only conditional access can be granted. we want to know if any reference belongs to self
      // if fullAuthGranted=false, authorizedRequestees empty and connections empty meaning you have no access at all, return empty
      if (!authResponse.fullAuthGranted && _.isEmpty(authResponse.authorizedRequestees) && _.isEmpty(authResponse.authorizedConnections)) {
        log.info(
          "fullAuthGranted was not granted, authorizedRequestees are empty and connections are empty. This means you have no access to search this resource."
        );
        return [];
      }
    } else if (searchOptions.resourceActions && searchOptions.queryParamToResourceScopeMap) {
      isSharingRuleCheckRequired = false;
      const resourceScope: string[] = [];
      Array.from(searchOptions.queryParamToResourceScopeMap.values()).forEach( (scope: string[]) => {
        resourceScope.concat(scope);
      });
      const authResponse = await AuthService.authorizePolicyBased(requestorProfileId, searchOptions.resourceActions, resourceScope);
      if (!authResponse.fullAuthGranted && _.isEmpty(authResponse.authorizedResourceScopes)) {
        log.info("fullAuthGranted was not granted, authorizedResourceScopes are empty, This means you have no access to search this resource.");
        return [];
      }
    } else {
      log.info("you have no access to search this resource.");
    }

    // if isDeleted attribute not present in query parameter then return active records
    if (!queryParams[Constants.IS_DELETED]) {
      queryParams[Constants.IS_DELETED] = [Constants.IS_DELETED_DEFAULT_VALUE];
    }
    // Validate query parameter data type and value
    QueryValidator.validateQueryParams(queryParams, attributesMapping);
    // Generate Search Query based on query parameter & config settings
    const whereClause: any = {
      [Op.or]: []
    };
    let queryObject: any = {};
    /*
     * Below line of code calls SharingRuleHelper class function to generate
     * and append SharingRule query clause along with queryObject
     */
    if (connections.length == 0) {
      const searchQueryParams = Object.assign({}, queryParams, filteredQueryParameter);
      queryObject = QueryGenerator.getFilterCondition(searchQueryParams, attributesMapping);
      whereClause[Op.or].push(queryObject);
    } else {
      log.info("status of isSharingRuleCheckRequired: " + isSharingRuleCheckRequired);
      connections.forEach((eachConnection: any) => {
        const modifiedQuery = Object.assign({}, queryParams, { [resourceOwnerElement]: [_.get(eachConnection, Constants.FROM_REFERENCE_KEY)] });
        queryObject = QueryGenerator.getFilterCondition(modifiedQuery, attributesMapping);
        const sharingRulesClause = isSharingRuleCheckRequired
          ? SharingRulesHelper.addSharingRuleClause(queryObject, eachConnection, model, Constants.ACCESS_READ)
          : queryObject;
        if (isSharingRuleCheckRequired && !_.isEmpty(sharingRulesClause[Op.and])) {
          log.info("Sharing rules not present for requested user");
          whereClause[Op.or].push(sharingRulesClause);
        }
      });
      if (isSharingRuleCheckRequired && !_.isEmpty(filteredQueryParameter)) {
        queryObject = QueryGenerator.getFilterCondition(filteredQueryParameter, attributesMapping);
        whereClause[Op.or].push(queryObject);
      }
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
