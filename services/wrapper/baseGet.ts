/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { GetOptions, SearchOptions } from "../../common/interfaces/baseInterfaces";
import { BadRequestResult, ForbiddenResult } from "../../common/objects/custom-errors";
import { tableNameToResourceTypeMapping } from "../../common/objects/tableNameToResourceTypeMapping";
import { DAOService } from "../dao/daoService";
import { I18N } from "../i18n/i18n";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
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
    const queryObject = { id, [Constants.META_IS_DELETED_KEY]: false };
    const options = { where: queryObject };
    let record = await DAOService.fetchOne(model, options);
    record = record.dataResource;
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
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
    await AuthService.authorizeConnectionBasedSharingRules({
      requester: requestorProfileId,
      ownerReference: patientIds[0],
      resourceType: serviceName,
      accessType: Constants.ACCESS_READ,
      resourceActions: getOptions ? getOptions.resourceActions : null
    });
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
    let subjectToProfileMap = {};
    let isSharingRuleCheckRequired: boolean = true;
    let isUserAuthorizedToSearch: boolean = true;
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
    // For definational resource resourceOwnerElement will be null
    if (_.isEmpty(queryParams) && resourceOwnerElement) {
      log.info("queryParams is empty, Adding the logged in user as resourceOwner in queryParams.");
      queryParams[resourceOwnerElement] = [requestorProfileId];
    }
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    const isResoucePublicAccessable: boolean = await AuthService.getResourceAccessLevel(serviceName, Constants.ACCESS_READ);
    const fetchedProfiles = await DataFetch.getUserProfile([requestorProfileId]);
    if (fetchedProfiles[requestorProfileId] && fetchedProfiles[requestorProfileId].profileType.toLowerCase() === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, Requester is system user :: authorizeMultipleConnectionsBasedSharingRules");
      isSharingRuleCheckRequired = false;
    } else if (isResoucePublicAccessable) {
      log.info("Resource access type is public, no authorization required");
      isSharingRuleCheckRequired = false;
    } else if (resourceOwnerElement) {
      log.info(resourceOwnerElement + " is the resourceOwnerElement. Attempting to perform owner based Authorization.");
      if (!queryParams[resourceOwnerElement]) {
        log.info("queryParams is empty or does not contain the resourceOwnerElement. Adding the logged in user as resourceOwner in queryParams.");
        queryParams[resourceOwnerElement] = [requestorProfileId];
        isSharingRuleCheckRequired = false;
      }
      let requestedProfiles =
        queryParams[resourceOwnerElement].length == 1 ? queryParams[resourceOwnerElement][0].split(Constants.COMMA_VALUE) : queryParams[resourceOwnerElement];
      requestedProfiles = _.map(requestedProfiles, (eachProfile: any) => {
        return eachProfile.indexOf(Constants.FORWARD_SLASH) == -1 ? [Constants.USER_PROFILE, eachProfile].join(Constants.FORWARD_SLASH) : eachProfile;
      });
      log.info("requestedProfiles = ", requestedProfiles);
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
      subjectToProfileMap = authResponse.subjectToProfileMap || {};
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
        isUserAuthorizedToSearch = false;
      }
    } else if (
      searchOptions &&
      searchOptions.resourceActions &&
      searchOptions.queryParamToResourceScopeMap &&
      searchOptions.queryParamToResourceScopeMap.size > 0
    ) {
      log.info(
        "searchOptions.resourceActions and searchOptions.queryParamToResourceScopeMap are provided. Attempting to perform resourceScope based Authorization."
      );
      isSharingRuleCheckRequired = false;
      let resourceScope: string[] = [];
      // concatenating all resources in the map values
      Array.from(searchOptions.queryParamToResourceScopeMap.values()).forEach((scope: string[]) => {
        resourceScope = resourceScope.concat(scope);
      });
      const authResponse = await AuthService.authorizePolicyBased(requestorProfileId, searchOptions.resourceActions, resourceScope);
      if (!authResponse.fullAuthGranted && _.isEmpty(authResponse.authorizedResourceScopes)) {
        log.info("fullAuthGranted was not granted, authorizedResourceScopes are empty, This means you have no access to search this resource.");
        isUserAuthorizedToSearch = false;
      }
    } else {
      log.info("loggedin user don't have to search this resource.");
      isUserAuthorizedToSearch = false;
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
        let resourceOwnerElementValue = _.get(eachConnection, Constants.FROM_REFERENCE_KEY);
        resourceOwnerElementValue = subjectToProfileMap[resourceOwnerElementValue]
          ? subjectToProfileMap[resourceOwnerElementValue]
          : [resourceOwnerElementValue];
        const modifiedQuery = Object.assign({}, queryParams, { [resourceOwnerElement]: [resourceOwnerElementValue.join(Constants.COMMA_VALUE)] });
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
        // if delete flag present then add to additional filter parameter
        if (queryParams[Constants.IS_DELETED]) {
          filteredQueryParameter[Constants.IS_DELETED] = queryParams[Constants.IS_DELETED];
        }
        queryObject = QueryGenerator.getFilterCondition(filteredQueryParameter, attributesMapping);
        whereClause[Op.or].push(queryObject);
      }
    }
    // Add offset and limit to generate next url
    queryParams.limit = fetchLimit;
    queryParams.offset = offset;
    if (!isUserAuthorizedToSearch) {
      log.error("User is not authorized to search");
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

  /**
   * Function to authorize retrieved record using scope based policy access or multiple owner based.
   * Function to be used by multiple owner services
   *
   * @static
   * @param {*} record
   * @param {string} requestorProfileId
   * @param {*} getOptions
   * @returns {*} translatedRecord
   * @memberOf BaseGet
   */
  public static async getResourcePolicyManagerBased(record: any, model, requestorProfileId: string, getOptions?: GetOptions) {
    log.info("In BaseGet :: getResourceScopeBased()");
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    log.info("Calling authorizePolicyManagerBased() :: getResourcePolicyManagerBased()");
    const authResponse = await AuthService.authorizePolicyManagerBased(
      requestorProfileId,
      serviceName,
      Constants.ACCESS_READ,
      getOptions.resourceScopeMap,
      getOptions.subjectReferences,
      getOptions.resourceActions
    );
    log.info("AuthResponse: ", authResponse);
    if (authResponse && !_.isEmpty(authResponse.authorizedConnections)) {
      if (authResponse.authorizedConnections.length > 0) {
        const id = record.id;
        const queryObject = { id, [Constants.META_IS_DELETED_KEY]: false };
        const whereClause: any = {
          [Op.or]: []
        };
        let sharingRulesClausePresent: boolean = false;
        authResponse.authorizedConnections.forEach((eachConnection: any) => {
          const sharingRulesClause = SharingRulesHelper.addSharingRuleClause(queryObject, eachConnection, model, Constants.ACCESS_READ);
          if (!_.isEmpty(sharingRulesClause[Op.and])) {
            whereClause[Op.or].push(sharingRulesClause);
            sharingRulesClausePresent = true;
          }
        });
        if (!sharingRulesClausePresent) {
          log.info("Sharing rules not present for requested users");
          throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
        }
        log.info("whereClause : " + JSON.stringify(whereClause));
        record = await DAOService.fetchOne(model, { where: whereClause });
        record = record.dataResource;
      }
    }
    log.info("User Authorization is successful ");
    // Translate Resource based on accept language
    const acceptLanguage = getOptions && getOptions.acceptLanguage;
    if (!acceptLanguage) {
      log.info("Translation option not present");
      return record;
    }
    const translatedRecord = I18N.translateResource(record, acceptLanguage);
    log.info("getResourceScopeBased() :: Record retrieved successfully");
    return translatedRecord;
  }

  /**
   * Function to authorize retrieved record using scope based policy acess.
   * Function to be used by multiple owner services
   *
   * @static
   * @param {*} record
   * @param {string} requestorProfileId
   * @param {*} getOptions
   * @returns {*} translatedRecord
   * @memberOf BaseGet
   */
  public static async getResourceScopeBased(record: any, model, requestorProfileId: string, getOptions?: GetOptions) {
    log.info("In BaseGet :: getResourceScopeBased()");
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    let resourceScope: string[] = [];
    // concatenating all resources in the map values
    Array.from(getOptions.resourceScopeMap.values()).forEach((scope: string[]) => {
      resourceScope = resourceScope.concat(scope);
    });
    const authResponse = await AuthService.authorizePolicyBased(
      requestorProfileId,
      getOptions.resourceActions,
      resourceScope,
      serviceName,
      Constants.ACCESS_READ
    );
    if (!authResponse.fullAuthGranted && _.isEmpty(authResponse.authorizedResourceScopes)) {
      log.info("fullAuthGranted was not granted, authorizedResourceScopes are empty, This means you have no access to get this resource.");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // Translate Resource based on accept language
    const acceptLanguage = getOptions && getOptions.acceptLanguage;
    if (!acceptLanguage) {
      log.info("Translation option not present");
      return record;
    }
    const translatedRecord = I18N.translateResource(record, acceptLanguage);
    log.info("getResourceScopeBased() :: Record retrieved successfully");
    return translatedRecord;
  }

  /**
   * Function to authorize retrieved record using scope based policy acess.
   * Function to be used by multiple owner services
   *
   * @static
   * @param {*} record
   * @param {string} requestorProfileId
   * @param {*} getOptions
   * @returns {*} translatedRecord
   * @memberOf BaseGet
   */
  public static async getResourceMultipleOwnerBased(record: any, model, requestorProfileId: string, getOptions?: GetOptions) {
    log.info("In BaseGet :: getResourceScopeBased()");
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    const authResponse = await AuthService.authorizeMultipleOwnerBased(
      requestorProfileId,
      getOptions.subjectReferences,
      serviceName,
      Constants.ACCESS_READ,
      getOptions.resourceActions
    );
    if (!authResponse.fullAuthGranted && (_.isEmpty(authResponse.authorizedRequestees) && _.isEmpty(authResponse.authorizedConnections))) {
      log.info(
        "fullAuthGranted was not granted, authorizedRequestees are empty or authorizedConnections are empty, This means you have no access to get this resource."
      );
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // Translate Resource based on accept language
    const acceptLanguage = getOptions && getOptions.acceptLanguage;
    if (!acceptLanguage) {
      log.info("Translation option not present");
      return record;
    }
    const translatedRecord = I18N.translateResource(record, acceptLanguage);
    log.info("getResourceScopeBased() :: Record retrieved successfully");
    return translatedRecord;
  }
}
