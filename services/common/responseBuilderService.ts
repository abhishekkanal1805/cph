import * as log from "lambda-log";
import * as lodash from "lodash";
import { Constants } from "../../common/constants/constants";
import { errorCode } from "../../common/constants/error-codes";
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

  public static generateSuccessResponse(
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
      result = this.setDisplayAttribute(result);
    }
    // createBundle = true;
    response["responseObject"] = this.createResponseObject(result, fullUrl, type, queryParams, createBundle);
    log.info("Exiting ResponseBuilderService :: generateSuccessResponse()");
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
      log.error("Custom Error occurred :: ", err.description);
      result = err;
    } else {
      log.error("Internal error occurred :: ", err);
      result = new BadRequestResult(errorCode.GeneralError, "Internal error occurred");
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
  public static setDisplayAttribute(result: any): any {
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
          const serviceObj: any = Utility.getServiceId(eachResult[displayAttribute].reference);
          if (serviceObj.resourceType.toLowerCase() === "userprofile") {
            displayValue = this.getDisplayAttribute(serviceObj.id);
            eachResult[displayAttribute].display = displayValue;
          }
        }
      }
    }
    // if input is bundle then return updated bundle else return object
    log.info("Exiting ResponseBuilderService :: setDisplayAttribute()");
    return createBundle ? result : result[0];
  }

  /**
   * Function to get display attribute.
   * @param {string} profileId profile id.
   * @returns display value.
   */
  public static getDisplayAttribute(profileId: string) {
    let displayValue = " ";
    if (ResponseBuilderService.displayMap.hasOwnProperty(profileId)) {
      log.debug("profileId exists in displayMap" + profileId);
      displayValue = ResponseBuilderService.displayMap[profileId];
    }
    return displayValue;
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
  public static createResponseObject(objectArray: any[], fullUrl?: string, type?: string, queryParams?: any, createBundle?: boolean) {
    log.info("Entering ResponseBuilderService :: createResponseObject()");
    const entryArray = [];
    const links = [];
    let responseObject: any;
    if (fullUrl) {
      log.debug("fullUrl value: " + fullUrl);
      for (const eachObject of objectArray) {
        const entry: any = {};
        entry.fullUrl = fullUrl + "/" + eachObject.id;
        entry.search = { mode: "match" };
        entry.resource = eachObject;
        entryArray.push(Object.assign(new Entry(), entry));
      }
      const linkObj: Link = new Link();
      linkObj.relation = "self";
      linkObj.url = Utility.createLinkUrl(fullUrl, queryParams);
      log.debug("Link Url: " + fullUrl);
      links.push(linkObj);
      responseObject = this.createBundle(entryArray, links, true);
    } else {
      if (!createBundle) {
        const result = lodash.isArray(objectArray) && objectArray.length > 0 ? objectArray[0] : objectArray;
        return result;
      }
      for (const eachObject of objectArray) {
        const entry: any = {};
        entry.resource = eachObject;
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

  public static generateUpdateResponse(
    result: any,
    errLogRef: string,
    isBundle?: boolean,
    isDisplay?: boolean,
    fullUrl?: string,
    type?: string,
    queryParams?: any
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
        result.savedRecords = this.setDisplayAttribute(result.savedRecords);
      }
      const successResult = this.createResponseObject(result.savedRecords, fullUrl, type, queryParams, isBundle);
      const errorResult = [];
      if (result.errorRecords && result.errorRecords.length > 0) {
        result.errorRecords.forEach((record) => {
          // set errorLogRef
          record.errorLogRef = errLogRef;
          const err = { error: record };
          errorResult.push(err);
        });
      }
      successResult.entry = [...successResult.entry, ...errorResult];
      response.responseType = Constants.RESPONSE_TYPE_OK;
      response["responseObject"] = successResult;
    } else if (result.savedRecords && result.savedRecords.length === 0) {
      const errorResult = [];
      if (result.errorRecords && result.errorRecords.length > 0) {
        result.errorRecords.forEach((record) => {
          // set errorLogRef
          record.errorLogRef = errLogRef;
          errorResult.push(record);
        });
      }
      response.responseType = Constants.RESPONSE_TYPE_BAD_REQUEST;
      response["responseObject"] = { errors: errorResult };
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
        response["responseObject"] = new InternalServerErrorResult(errorCode.ResourceNotFound, "Error occoured during this operation");
      }
    }
    return response;
  }
}

export { ResponseBuilderService };
