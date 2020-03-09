/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as lodash from "lodash";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import * as config from "../../common/objects/config";
import {
  BadRequestResult,
  ErrorResult,
  ForbiddenResult,
  InsufficientAccountPermissions,
  InternalServerErrorResult,
  NotFoundResult,
  UnAuthorizedResult,
  UnprocessableEntityResult
} from "../../common/objects/custom-errors";
import { Bundle } from "../../models/common/bundle";
import { Entry } from "../../models/common/entry";
import { Link } from "../../models/common/link";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
import { DAOService } from "../dao/daoService";
import { Utility } from "./Utility";

const response = {
  responseType: "",
  responseObject: {}
};
// const displayMap: any = {};

interface Response {
  responseType: string;
  responseObject: object;
}

class ResponseBuilderService {
  /**
   * Function to convert response from lambda service to appropriate API response based on incoming response type.
   * @param result Incoming response from database service
   * @param contextData AWS context data
   * @param createBundle flag to notify whether response should be a bundle or not
   * @param populateDisplayAttribute flag to check if we need to add display field attribute
   * @param fullUrl Full base URL of individual record.
   * @param type Key of config file to be used in search for accepted attributes.
   * @param queryParams AWS request query params
   *
   * @returns Updated response w.r.t service response and parameter passed.
   */

  public static displayMap: any = {};
  public static typeMap: any = {};

  public static async generateSuccessResponse(
    result: any,
    createBundle?: boolean,
    populateDisplayAttribute?: boolean,
    fullUrl?: string,
    type?: string,
    queryParams?: any
  ) {
    log.info("Entering ResponseBuilderService :: generateSuccessResponse()");
    if (createBundle === undefined) {
      createBundle = true;
    }
    if (populateDisplayAttribute === undefined) {
      populateDisplayAttribute = true;
    }

    response.responseType = Constants.RESPONSE_TYPE_OK;
    if (populateDisplayAttribute) {
      log.info("Display attribute set as true in ResponseBuilderService :: generateSuccessResponse()");
      result = await this.setDisplayAttribute(result);
    }
    // createBundle = true;
    response["responseObject"] = this.createResponseObject(result, fullUrl, type, queryParams, createBundle);
    log.info("Exiting ResponseBuilderService :: generateSuccessResponse()");
    return response;
  }

  /**
   * Function to convert response from lambda service to appropriate API response based for delete endpoint.
   * @param result Incoming response from service
   *
   * @return Updated response w.r.t Delete endpoint.
   */
  public static generateDeleteResponse(result) {
    log.info("Entering ResponseBuilderService :: generateDeleteResponse()");
    response.responseType = Constants.RESPONSE_TYPE_NO_CONTENT;
    response.responseObject = result;
    log.info("Exiting ResponseBuilderService :: generateDeleteResponse()");
    return response;
  }

  /**
   * Function to convert response from lambda service to appropriate API error response based on incoming response type.
   * @param err Error object
   * @param errorLogRef error log reference
   *
   * @returns Updated response w.r.t service response and parameter passed.
   */
  public static generateErrorResponse(err: any, errorLogRef: string, clientRequestId?: string): Response {
    log.info("Entering ResponseBuilderService :: generateErrorResponse()");
    let result: ErrorResult;
    if (err.description) {
      log.error("Custom Error occurred :: " + err.description);
      result = err;
    } else {
      log.error("Internal error occurred :: " + err);
      result = new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }
    result.errorLogRef = errorLogRef;
    result.clientRequestId = clientRequestId;
    response["responseObject"] = result;

    log.info("Entering ResponseBuilderService :: generateErrorResponse()");
    switch (result.constructor) {
      case BadRequestResult:
        response.responseType = Constants.RESPONSE_TYPE_BAD_REQUEST;
        break;
      case InternalServerErrorResult:
        response.responseType = Constants.RESPONSE_TYPE_INTERNAL_SERVER_ERROR;
        break;
      case NotFoundResult:
        response.responseType = Constants.RESPONSE_TYPE_NOT_FOUND;
        break;
      case ForbiddenResult:
      case InsufficientAccountPermissions:
        response.responseType = Constants.RESPONSE_TYPE_INSUFFICIENT_ACCOUNT_PERMISSIONS;
        break;
      case UnAuthorizedResult:
        response.responseType = Constants.RESPONSE_TYPE_UNAUTHORIZED;
        break;
      case UnprocessableEntityResult:
        response.responseType = Constants.UNPROCESSABLE_ENTITY;
    }
    return response;
  }

  /**
   * Function to set display attribute.
   * @param {any} result records where display attribute needs to be updated.
   * @returns Updated records.
   */
  public static async setDisplayAttribute(result: any) {
    log.info("Entering ResponseBuilderService :: setDisplayAttribute()");
    let displayValue = "";
    const createBundle = lodash.isArray(result);
    // if not bundle then convert it bundle and update reference
    if (!createBundle) {
      result = [result];
    }
    for (const eachResult of result) {
      for (const displayAttribute of config.data.displayFields) {
        if (eachResult[displayAttribute] && eachResult[displayAttribute].reference) {
          const profileReference: string = eachResult[displayAttribute].reference;
          if (profileReference.indexOf(Constants.USER_PROFILE) > -1) {
            displayValue = await this.getDisplayAttribute(profileReference);
            eachResult[displayAttribute].display = displayValue;
            eachResult[displayAttribute].type = ResponseBuilderService.typeMap[profileReference];
          } else {
            eachResult[displayAttribute].type = profileReference.split(Constants.FORWARD_SLASH)[0];
          }
        }
      }
      // Adding type value non display attributes
      const nonDisplayAttributes = lodash.concat(config.data.nonUserDisplayFields, config.data.typeAttributeAdditionalFields);
      for (const nonDisplayAttribute of nonDisplayAttributes) {
        if (eachResult[nonDisplayAttribute] && eachResult[nonDisplayAttribute].reference) {
          if (eachResult[nonDisplayAttribute].reference.indexOf(Constants.FORWARD_SLASH) > -1) {
            eachResult[nonDisplayAttribute].type = eachResult[nonDisplayAttribute].reference.split(Constants.FORWARD_SLASH)[0];
          }
        }
      }
    }
    // if input is bundle then return updated bundle else return object
    // clear display map to avoid data inconsistency
    ResponseBuilderService.displayMap = {};
    log.info("Exiting ResponseBuilderService :: setDisplayAttribute()");
    return createBundle ? result : result[0];
  }

  /**
   * Function to get display attribute.
   * @param {string} profileReference profile refrence UserProfile/123
   * @returns display value.
   */
  public static async getDisplayAttribute(profileReference: string) {
    if (!ResponseBuilderService.displayMap.hasOwnProperty(profileReference)) {
      log.info("The displayMap does not contain this profile, fetching profileId=" + profileReference);
      await ResponseBuilderService.initDisplayName(profileReference);
    }
    const displayValue = ResponseBuilderService.displayMap[profileReference];
    return displayValue;
  }

  /**
   * If the display name for this profile is not found inthe map we attempt to fetch profile
   * and construct the name and add it to the map for later use.
   * If exception, we will not add any map entry
   * @param {string} profileReference UserProfile/123
   * @returns {Promise<string>}
   */
  public static async initDisplayName(profileReference: string) {
    try {
      const profileObj: any = Utility.getServiceId(profileReference);
      const result = await DAOService.fetchByPk(profileObj.id, UserProfile);
      // if user is valid then set display attribute and profile status
      const givenName = result.name ? result.name.given || [] : [];
      const familyName = result.name ? result.name.family || "" : "";
      const displayName = [familyName, givenName.join(" ")].join(", ");
      log.info("Initialized the displayMap with {profileId:" + profileObj.id + ", displayName=" + displayName + "}");
      ResponseBuilderService.displayMap[profileReference] = displayName ? displayName : " ";
      ResponseBuilderService.typeMap[profileReference] = [result.resourceType, result.type].join(".");
    } catch (e) {
      log.error("Error constructing display name for profileId=" + profileReference);
    }
  }

  /**
   * Function to create response object.
   * @param {any[]} objectArray array of records.
   * @param {string} fullUrl endpoint URL.
   * @param {string} type service type.
   * @param {any} queryParams query parameters.
   * @param {boolean} createBundle records bundle needs to be created or not.
   * @returns response object.
   */
  public static createResponseObject(objectArray: any, fullUrl?: string, type?: string, queryParams?: any, createBundle?: boolean) {
    log.info("Entering ResponseBuilderService :: createResponseObject()");
    let entryArray = [];
    const revincludeResourceArray = [];
    const links = [];
    let responseObject: any;
    if (fullUrl) {
      log.debug("fullUrl value: " + fullUrl);
      let revincludeValue = "";
      if (queryParams._revinclude) {
        revincludeValue = queryParams._revinclude[0].split(":")[0];
      }
      let resourceArray = objectArray;
      let revincludeArray = [];
      if (revincludeValue) {
        resourceArray = objectArray.filter((eachResource: any) => eachResource.resourceType != revincludeValue);
        revincludeArray = objectArray.filter((eachResource: any) => eachResource.resourceType == revincludeValue);
      }
      for (const eachObject of resourceArray) {
        const entry: any = {};
        entry.fullUrl = fullUrl + Constants.FORWARD_SLASH + eachObject.id;
        entry.search = { mode: Constants.MATCH };
        entry.resource = eachObject;
        entryArray.push(Object.assign(new Entry(), entry));
      }
      for (const eachObject of revincludeArray) {
        const entry: any = {};
        const resource = fullUrl.split(Constants.URL_SPLIT_OPERATOR)[1];
        fullUrl = fullUrl.replace(resource, revincludeValue);
        entry.fullUrl = fullUrl + Constants.FORWARD_SLASH + eachObject.id;
        entry.search = { mode: Constants.INCLUDE };
        entry.resource = eachObject;
        revincludeResourceArray.push(Object.assign(new Entry(), entry));
      }
      const linkObj: Link = new Link();
      linkObj.relation = Constants.SELF;
      linkObj.url = Utility.createLinkUrl(fullUrl, queryParams);
      log.debug("Link Url: " + fullUrl);
      links.push(linkObj);
      if (entryArray.length == queryParams.limit + 1) {
        entryArray = entryArray.slice(0, entryArray.length - 1);
        const nextLinkObj: Link = new Link();
        nextLinkObj.relation = Constants.NEXT;
        queryParams.limit = queryParams.limit;
        queryParams.offset += queryParams.limit;
        nextLinkObj.url = Utility.createNextLinkUrl(fullUrl, queryParams);
        links.push(nextLinkObj);
      }
      if (revincludeResourceArray.length) {
        entryArray = [...entryArray, ...revincludeResourceArray];
      }
      responseObject = this.createBundle(entryArray, links, true);
    } else {
      if (!createBundle) {
        const result = lodash.isArray(objectArray) && objectArray.length > 0 ? objectArray[0] : objectArray;
        return result;
      }
      for (const eachObject of objectArray) {
        const entry: any = {};
        entry.resource = eachObject;
        entryArray.push(Object.assign(new Entry(), entry));
      }
      responseObject = this.createBundle(entryArray, [], false);
    }
    responseObject = Object.assign(new Bundle(), responseObject);
    log.info("Exiting ResponseBuilderService :: createResponseObject()");
    return responseObject;
  }

  /**
   * Create bundle for provided entries.
   * @param {Entry[]} entryArray
   * @param {Link[]} links
   * @returns {Promise<Bundle>}
   */
  public static createBundle(entryArray: Entry[], links: Link[], populateExtraParams: boolean) {
    log.info("Inside Utility: createBundle()");
    // Removing total attribute from spec as per new spec
    const bundle: Bundle = new Bundle();
    if (populateExtraParams) {
      bundle.type = Constants.BUNDLE_TYPE;
      bundle.link = links;
    }
    bundle.resourceType = Constants.BUNDLE;
    bundle.total = entryArray.length;
    bundle.entry = entryArray;
    return bundle;
  }

  public static async generateUpdateResponse(
    result: any,
    isBundle?: boolean,
    isDisplay?: boolean,
    fullUrl?: string,
    type?: string,
    queryParams?: any,
    errLogRef?: string
  ) {
    errLogRef = errLogRef || "";
    if (isBundle === undefined) {
      isBundle = true;
    }
    if (isDisplay === undefined) {
      isDisplay = true;
    }
    log.info("Entering ResponseBuilderService :: generateUpdateResponse()");
    if (result.savedRecords && result.savedRecords.length > 0) {
      if (isDisplay) {
        result.savedRecords = await this.setDisplayAttribute(result.savedRecords);
      }
      const successResult = this.createResponseObject(result.savedRecords, fullUrl, type, queryParams, isBundle);
      const errorResult = [];
      let multiStatus = false;
      if (result.errorRecords && result.errorRecords.length > 0) {
        multiStatus = true;
        result.errorRecords.forEach((record) => {
          // set errorLogRef
          record.errorLogRef = errLogRef;
          const err = { error: record };
          errorResult.push(err);
        });
      }
      if (isBundle) {
        successResult.entry = [...successResult.entry, ...errorResult];
      }
      response.responseType = multiStatus ? Constants.RESPONSE_TYPE_MULTI_STATUS : Constants.RESPONSE_TYPE_OK;
      response["responseObject"] = successResult;
    } else if (result.errorRecords && result.errorRecords.length > 0) {
      const errorResult = [];
      result.errorRecords.forEach((record) => {
        // set errorLogRef
        record.errorLogRef = errLogRef;
        errorResult.push(record);
      });
      if (errorResult.length > 1) {
        response.responseType = Constants.RESPONSE_TYPE_MULTI_STATUS;
      } else {
        if (errorResult[0] instanceof BadRequestResult) {
          response.responseType = Constants.RESPONSE_TYPE_BAD_REQUEST;
        } else if (errorResult[0] instanceof InternalServerErrorResult) {
          response.responseType = Constants.RESPONSE_TYPE_INTERNAL_SERVER_ERROR;
        } else if (errorResult[0] instanceof NotFoundResult) {
          response.responseType = Constants.RESPONSE_TYPE_NOT_FOUND;
        } else if (errorResult[0] instanceof ForbiddenResult || result instanceof InsufficientAccountPermissions) {
          response.responseType = Constants.RESPONSE_TYPE_INSUFFICIENT_ACCOUNT_PERMISSIONS;
        } else if (errorResult[0] instanceof UnAuthorizedResult) {
          response.responseType = Constants.RESPONSE_TYPE_UNAUTHORIZED;
        } else {
          response.responseType = Constants.RESPONSE_TYPE_INTERNAL_SERVER_ERROR;
          response["responseObject"] = new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
        }
      }
      response["responseObject"] = { errors: errorResult };
    } else if (result.savedRecords && result.savedRecords.length === 0 && result.errorRecords && result.errorRecords.length === 0) {
      const successResult: Bundle = new Bundle();
      successResult.resourceType = Constants.BUNDLE;
      successResult.total = 0;
      successResult.entry = [];
      response.responseType = Constants.RESPONSE_TYPE_OK;
      response["responseObject"] = successResult;
    } else {
      const errorResult = {
        errors: result.errorRecords
      };
      if (result instanceof BadRequestResult || (result.errorRecords.length > 0 && result.errorRecords[0] instanceof BadRequestResult)) {
        response.responseType = Constants.RESPONSE_TYPE_BAD_REQUEST;
        response["responseObject"] = errorResult;
      } else if (result instanceof InternalServerErrorResult) {
        response.responseType = Constants.RESPONSE_TYPE_INTERNAL_SERVER_ERROR;
        response["responseObject"] = errorResult;
      } else if (result instanceof NotFoundResult) {
        response.responseType = Constants.RESPONSE_TYPE_NOT_FOUND;
        response["responseObject"] = errorResult;
      } else if (result instanceof ForbiddenResult || result instanceof InsufficientAccountPermissions) {
        response.responseType = Constants.RESPONSE_TYPE_INSUFFICIENT_ACCOUNT_PERMISSIONS;
        response["responseObject"] = errorResult;
      } else {
        response.responseType = Constants.RESPONSE_TYPE_INTERNAL_SERVER_ERROR;
        response["responseObject"] = new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
      }
    }
    return response;
  }
}

export { ResponseBuilderService };
