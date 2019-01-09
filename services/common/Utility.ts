import * as Hashids from "hashids";
import * as log from "lambda-log";
import * as lodash from "lodash";
import * as moment from "moment";
import * as requestPromise from "request-promise";
import * as uuid from "uuid";
import { Constants } from "../../common/constants/constants";
import { errorCode } from "../../common/constants/error-codes";
import { ApiEvent } from "../../common/objects/api-interfaces";
import * as config from "../../common/objects/config";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { UnprocessableEntityErrorResult } from "../../common/objects/unprocessableEntityErrorResult";
import { Bundle } from "../../models/common/bundle";
import { Entry } from "../../models/common/entry";
import { Link } from "../../models/common/link";

export class Utility {
  /**
   * Receives dateString and generates prefix object
   * @param {string} date
   * @example
   * const input = 'lt20-10-1991'
   * getPrefixDate(input) // {"prefix": "lt", "date": "20-10-1991"}
   * @returns {object}
   */
  public static getPrefixDate(date: string) {
    let offset = 0;
    const dateLength = date.length;
    while (true) {
      if (dateLength == offset) {
        break;
      } else {
        if (!isNaN(parseInt(date[offset]))) {
          break;
        }
      }
      offset++;
    }
    return {
      prefix: date.slice(0, offset),
      date: date.slice(offset, dateLength)
    };
  }

  /**
   * Receives queryParams and validParams and check whether all the queryParams are valid or not
   * @param {*} queryParams
   * @param {*} validParams
   * @example
   * @returns {boolean}
   */
  public static validateQueryParams(queryParams: any, validParams: any) {
    log.info("Inside Utility: validateQueryParams()");
    const result: boolean = true;
    for (const key in queryParams) {
      const attrIdx = lodash.findIndex(validParams, (d: any) => d.map === key);
      if (attrIdx === -1) {
        log.error("Failed for attribute: " + key);
        return false;
      }
      const paramDataType = validParams[attrIdx]["type"];
      let paramValue = queryParams[key];
      if (paramDataType === "date") {
        if (paramValue.includes(",")) {
          for (const value of paramValue.split(",")) {
            paramValue = this.getPrefixDate(value).date;
            const dateTime = moment(paramValue, "YYYY-MM-DDTHH:mm:ss.SSSSZ", true).isValid();
            const date = moment(paramValue, "YYYY-MM-DD", true).isValid();
            if (!(dateTime || date)) {
              log.error("Failed for attribute: " + key + " as it is not a ISOString.");
              return false;
            }
          }
        } else if (paramValue.includes("&")) {
          for (const value of paramValue.split("&")) {
            paramValue = this.getPrefixDate(value).date;
            const dateTime = moment(paramValue, "YYYY-MM-DDTHH:mm:ss.SSSSZ", true).isValid();
            const date = moment(paramValue, "YYYY-MM-DD", true).isValid();
            if (!(dateTime || date)) {
              log.error("Failed for attribute: " + key + " as it is not a ISOString.");
              return false;
            }
          }
        } else {
          paramValue = this.getPrefixDate(paramValue).date;
          const dateTime = moment(paramValue, "YYYY-MM-DDTHH:mm:ss.SSSSZ", true).isValid();
          const date = moment(paramValue, "YYYY-MM-DD", true).isValid();
          if (!(dateTime || date)) {
            log.error("Failed for attribute: " + key + " as it is not a ISOString.");
            return false;
          }
        }
      } else if (paramDataType === "number") {
        paramValue = this.getPrefixDate(paramValue).date;
        const numberStatus = lodash.isNaN(lodash.toNumber(paramValue));
        if (numberStatus) {
          log.error("Failed for attribute: " + key + " as it is not a number.");
          return false;
        }
      } else if (paramDataType === "boolean") {
        const boolStatus = ["true", "false"].indexOf(paramValue.toLowerCase());
        if (boolStatus === -1) {
          log.error("Failed for attribute: " + key + " as it is not a boolean value.");
          return false;
        }
      }
    }
    return result;
  }

  /**
   *
   * @param queryParams
   * @param {string} errorLogRef
   * @returns {UnprocessableEntity}
   */
  public static validateMultiValueQueryParams(queryParams: any, errorLogRef: string) {
    log.info("Inside Utility: validateMultiValueQueryParams()");
    for (const param in queryParams) {
      if (queryParams[param].includes("&")) {
        const dateValues: string[] = queryParams[param].split("&");
        if (dateValues.length > 2) {
          log.error("Failed for attribute: " + param + " as it contains more than 2 dates");
          return new UnprocessableEntityErrorResult(
            errorCode.UnprocessableEntity,
            "Failed for attribute: " + param + " as it contains more than 2 dates",
            errorLogRef
          );
        }
        if (
          Utility.getPrefixDate(dateValues[0]).prefix.length === 0 ||
          Utility.getPrefixDate(dateValues[1]).prefix.length === 0
        ) {
          log.error("Failed for attribute: " + param + " as all input dates do not have prefixes.");
          return new UnprocessableEntityErrorResult(
            errorCode.UnprocessableEntity,
            "Failed for attribute: " + param + " as all input dates do not have prefixes.",
            errorLogRef
          );
        }
        if (
          Utility.getPrefixDate(dateValues[0]).prefix === Utility.getPrefixDate(dateValues[1]).prefix ||
          Utility.getPrefixDate(dateValues[0]).prefix.charAt(0) ===
            Utility.getPrefixDate(dateValues[1]).prefix.charAt(0)
        ) {
          log.error("Failed for attribute: " + param + " as all input dates have same prefixes.");
          return new UnprocessableEntityErrorResult(
            errorCode.UnprocessableEntity,
            "Failed for attribute: " + param + " as all input dates have same prefixes.",
            errorLogRef
          );
        }
        for (const value of dateValues) {
          if (
            lodash.findIndex(config.data.validDatePrefixes, (d: any) => d === Utility.getPrefixDate(value).prefix) ===
            -1
          ) {
            log.error("Failed for attribute: " + param + " as input dates have invalid prefix.");
            return new UnprocessableEntityErrorResult(
              errorCode.UnprocessableEntity,
              "Failed for attribute: " + param + " as input dates have invalid prefix.",
              errorLogRef
            );
          }
        }
      }
    }
    return "Success";
  }

  /**
   * Retuns the Mapped attributes on basis of provided endpoints.
   * @param attribute
   * @param prop
   * @param endpoint
   * @returns {any}
   */
  public static getMappedAttribute(attribute, prop, endpoint) {
    log.info("Inside Utility: getMappedAttribute()");
    const mapped = config.settings[endpoint].searchAttributes;
    const index = mapped.findIndex((x) => x[prop] == attribute);
    if (index > -1) {
      return mapped[index];
    } else {
      return null;
    }
  }

  /**
   * Returns current timestamp
   * @example
   * getTimeStamp() // 2018-09-03T08:18:45.732Z
   * @returns {string}
   */
  public static getTimeStamp() {
    return new Date().toISOString();
  }

  /**
   * Receives createdByUser, modifiedByUser and clientRequestId, generates metadata information for that record
   * @param {string}
   * @param {string}
   * @param {string}
   * @example
   * const createdByUser = '45de787a-cf38-4ecd-9541-d7ba641ecb4e'
   * const modifiedByUser = '45de787a-cf38-4ecd-9541-d7ba641ecb4e'
   * const clientRequestId = ''
   * getMetadata(createdByUser, modifiedByUser, clientRequestId)
   * @returns {Object}
   */
  public static getMetadata(createdByUser: string, modifiedByUser: string, clientRequestId: string) {
    const timestamp = this.getTimeStamp();
    const metaDataObject = {
      versionId: 1,
      created: timestamp,
      lastUpdated: timestamp,
      createdBy: createdByUser,
      lastUpdatedBy: modifiedByUser,
      isDeleted: false,
      clientRequestId
    };
    return metaDataObject;
  }

  /**
   * Receives createdByUser, modifiedByUser and clientRequestId, generates metadata information for that record
   * @param {string}
   * @param {string}
   * @param {string}
   * @example
   * const createdByUser = '45de787a-cf38-4ecd-9541-d7ba641ecb4e'
   * const modifiedByUser = '45de787a-cf38-4ecd-9541-d7ba641ecb4e'
   * const clientRequestId = ''
   * getMetadata(createdByUser, modifiedByUser, clientRequestId)
   * @returns {Object}
   */
  public static getRecordMeta(createdByUser: string, modifiedByUser: string) {
    log.info("Entering Utility: getRecordMeta()");
    const timestamp = this.getTimeStamp();
    const metaDataObject = {
      versionId: 1,
      created: timestamp,
      lastUpdated: timestamp,
      createdBy: createdByUser,
      lastUpdatedBy: modifiedByUser,
      isDeleted: false,
      clientRequestId: " "
    };
    log.info("Exiting Utility: getRecordMeta()");
    return metaDataObject;
  }

  /**
   * Returns updated version ID
   * @param {*} versionId
   * @example
   * getUpdatedVersionId(1) // 2
   * getUpdatedVersionId('v1') // 2
   * @returns {number}
   */
  public static getUpdatedVersionId(versionId: any) {
    log.info("Inside Utility: getUpdatedVersionId()");
    let newVersionId = parseInt(versionId) ? parseInt(versionId) : parseInt(versionId.slice(1));
    newVersionId += 1;
    return newVersionId;
  }

  /**
   *
   * Returns Updated metadata object for a record
   * @param {*} metaDataObject
   * @param {string} modifiedByUser
   * @param {boolean} isDeleted
   * @example
   * const modifiedByUser = '45de787a-cf38-4ecd-9541-d7ba641ecb4e'
   * const isDeleted = true
   * getUpdateMetadata(metaDataObject, modifiedByUser, isDeleted)
   * @returns {Object}
   */
  public static getUpdateMetadata(metaDataObject: any, modifiedByUser: string, isDeleted: boolean) {
    log.info("Inside Utility: getUpdateMetadata()");
    const timestamp = this.getTimeStamp();
    metaDataObject.versionId = this.getUpdatedVersionId(metaDataObject.versionId);
    metaDataObject.lastUpdated = timestamp;
    metaDataObject.lastUpdatedBy = modifiedByUser;
    metaDataObject.isDeleted = isDeleted;
    return metaDataObject;
  }

  /**
   * Removes the internal attributes which starts with _ i.e. underscore.
   * @param {Object} object
   * @returns {Promise<Object>}
   */
  static removeInternalAttributes(object: any) {
    const objectKeys = Object.keys(object);
    objectKeys.forEach((item) => {
      if (item.indexOf("_") == 0) {
        delete object[item];
      }
    });
    return object;
  }

  /**
   * Gets the resource URL.
   * @param {ApiEvent} event
   * @returns {string}
   */
  public static getResourceFullUrl(event: ApiEvent) {
    log.info("Inside Utility: getResourceFullUrl()");
    const scheme = event["headers"]["X-Forwarded-Proto"];
    const hostName = event["headers"]["Host"];
    const path = event.requestContext["path"];
    const fullUrl = scheme + "://" + hostName + path;
    return fullUrl;
  }

  /**
   * Converts the provided attributes of the Object to lower case.
   * @param {Object} object
   * @param attributes
   * @returns {Promise<Object>}
   */
  public static async convertToLowerCase(object: any, attributes) {
    log.info("Inside Utility: convertToLowerCase()");
    for (const each of attributes) {
      const item = object[each];
      if (item) {
        object[each] = new Date(item).toString() !== "Invalid Date" ? item : item.toLowerCase();
      }
    }
    return object;
  }

  /**
   * retrieves the array of userids from the resource
   * @param {any} result
   * @param {string} userValidationId
   * @returns {string[]} uniqIds
   */
  public static getUserIds(result: any, userValidationId: string) {
  /*
    subject/informationsource/patient will always have reference attribute
    and value will be UserProfile/id else it will fail in schema validation
  */
   log.info("Entering baseServiceRDS :: getUserIds()");
   const isBundle = lodash.isArray(result);
   if (!isBundle) {
     result = [result];
   }
   userValidationId = userValidationId || "informationSource.reference";
   const foundIDs = lodash.uniq(
     lodash.map(result, (item) => {
       const value = this.getAttributeValue(item, userValidationId);
       if (value && value.toString().toLowerCase().startsWith("userprofile")) {
         return value.toString().split("/")[1];
       } else {
         return value;
       }
     })
   );
   return foundIDs;
  }

  /**
   * Get Internal Attributes i.e. User Id and Unique Id for provided Resource Id.
   * @param {string} id
   * @returns {object}
   */
  public static getInternalAttributes(id: string, partitionKey?: string, sortKey?: string, sepatator?: string): object {
    log.info("Inside Utility: getInternalAttributes()");
    sepatator = sepatator || ".";
    partitionKey = partitionKey || "userId";
    sortKey = sortKey || "uniqueId";
    const userAttributes: any = {};
    const idsArr: any = id.split(sepatator);
    userAttributes[partitionKey] = idsArr[0];
    // Added to handel invitation and connection
    userAttributes[sortKey] = idsArr.slice(1).join(sepatator);
    return userAttributes;
  }

  /**
   * Gets Unique Id for provided Resource Id.
   * @param {string} id
   * @returns {string}
   */
  public static getUniqueId(id: string): string {
    return id.split(".")[1];
  }

  /**
   * Gets Resource Id from userID and uniqueId of the provided object.
   * @param {object} obj
   * @returns {string}
   */
  public static getResourceId(obj: object, partitionKey?: string, sortKey?: string): string {
    partitionKey = partitionKey || "_userId";
    sortKey = sortKey || "_uniqueId";
    const userId = obj[partitionKey];
    const uniqueId = obj[sortKey];
    // Modified to support consent
    return [userId, uniqueId].filter((d) => d).join(".");
  }

  /**
   * Creates a bundle of resources from the provided event body if there are multiple resources.
   * Returns a resource if the there only one resource present in event body.
   * @param {string} eventBody
   * @returns {Promise<any[]>}
   */
  public static async getResourceArray(eventBody: string) {
    log.info("Inside Utility: getResourceArray()");
    const requestBody = JSON.parse(eventBody);
    let resourceArray = [];
    if (!(requestBody.entry instanceof Array)) {
      log.debug("Single resource received");
      resourceArray.push(requestBody);
      return resourceArray;
    }
    const resources = requestBody.entry;
    resourceArray = await resources.map((entry) => entry.resource);
    return resourceArray;
  }

  /**
   * Convert ["informationSource", "subject", "patient"].reference to camelcase
   * Convert any variation of userprofile to "UserProfile" before save
   * @param {any[]} record can be a object or bundle
   * @returns {Promise<any>}
   */
  public static getUpdatedRecordAndIds(records: any[], userIdAttribute: string, resource: any) {
    log.info("Entering utility: getUpdatedRecordAndIds()");
    const uniqIds = {};
    // if not bundle then convert it bundle and update reference
    for (const eachEntry of records) {
      let insertRecordtoResource = true;
      for (const displayAttribute of config.data.displayFields) {
          if (eachEntry[displayAttribute] && eachEntry[displayAttribute].reference) {
              const serviceObj: any = Utility.getServiceId(eachEntry[displayAttribute].reference);
              if (serviceObj.resourceType.toLowerCase() != "userprofile") {
                log.error("Error occoured as resourceType is not userprofile");
                const badRequest = new BadRequestResult(
                  errorCode.InvalidUserId, "UserProfile missing in reference");
                if (eachEntry.meta && eachEntry.meta.clientRequestId) {
                  badRequest.clientRequestId = eachEntry.meta.clientRequestId;
                }
                resource.errorRecords.push(badRequest);
                insertRecordtoResource = false;
                break;
              }
              eachEntry[displayAttribute].reference = ["UserProfile", serviceObj.id].join("/");
              if (userIdAttribute.trim().split(".")[0] === displayAttribute ) {
                if (!uniqIds[serviceObj.id]) {
                  uniqIds[serviceObj.id] = 1;
                }
              }
          }
      }
      if (insertRecordtoResource) {
        resource.savedRecords.push(eachEntry);
      }
    }
    // if input is bundle then return updated bundle else return object
    log.info("Exiting utility: getUpdatedRecordAndIds()");
    return Object.keys(uniqIds);
  }

  public static getResourceFromRequest(eventBody: string) {
    log.info("Inside Utility: getResourceFromRequest()");
    let requestBody: any;
    let resourceArray = [];
    try {
      requestBody = JSON.parse(eventBody);
    } catch (error) {
      // error in the above string (in this case, yes)!
      log.error("getResourceFromRequest() failed :: Exiting Utility :: getResourceFromRequest()");
      throw new BadRequestResult(errorCode.InvalidInput, "Provided resource is invalid");
    }
    if (!lodash.isArray(requestBody.entry)) {
      log.debug("Single resource received");
      resourceArray.push(requestBody);
      return resourceArray;
    }
    resourceArray = requestBody.entry.map((entry) => entry.resource);
    if ( resourceArray.length !== requestBody.total) {
      log.error("Error: entries length do not match total count");
      throw new BadRequestResult(
        errorCode.InvalidCount,
        "Bundle total attribute doesn't match number of records in request"
      );
    }
    if ( resourceArray.length > Constants.POST_LIMIT) {
      log.error("Error: entries total count is more than allowed records");
      throw new BadRequestResult(
        errorCode.InvalidCount,
        "Bundle record count is more than allowed records"
      );
    }
    return resourceArray;
  }

  public static setInternalAttributes(obj: any, userId: string, partitionKey?: string, sortKey?: string) {
    partitionKey = partitionKey || "_userId";
    obj[partitionKey] = userId;
    // Modified to support consent and other service until migration
    if (sortKey === undefined) {
      sortKey = "_uniqueId";
      obj[sortKey] = uuid();
    } else if (sortKey) {
      obj[sortKey] = uuid();
    } else {
      obj[sortKey] = undefined;
    }
    // Uncomment after migration setInternalAttributesNew
    obj["id"] = this.getResourceId(obj, partitionKey, sortKey);
    return obj;
  }

  public static setInternalAttributesNew(obj: any, userId: string, partitionKey?: string, sortKey?: string) {
    userId = obj[partitionKey];
    const uniqueId = obj[sortKey] || "";
    if (uniqueId) {
      return [userId, uniqueId].join(".");
    }
    return userId;
  }

  /**
   * Reads the bundle and Returns the Ids present in resource bundle.
   * @param {any[]} bundle
   * @returns {Promise<any[]>}
   */
  public static findIds(bundle: any[], userId?: string): any {
    log.info("Inside Utility: findIds()");
    userId = userId || "informationSource.reference";
    const foundIDs = lodash.uniq(
      lodash.map(bundle, (item) => {
        const value = this.getAttributeValue(item, userId);
        if (value && value.toString().toLowerCase().startsWith("userprofile")) {
          return value.toString().split("/")[1];
        } else {
          return value;
        }
      })
    );
    return foundIDs.length ? foundIDs : [];
  }

  /**
   * Reads the bundle and Returns the Record Ids.
   * @param {any[]} bundle
   * @returns {Promise<any[]>}
   */
  public static getSpecificAttribute(bundle: any[], key: string): any {
    log.info("Inside Utility: getIds()");
    const foundIDs = lodash.map(bundle, (item) => {
      return this.getAttributeValue(item, key);
    });
    return foundIDs.length ? foundIDs : [];
  }

  /**
   *
   * Reads the bundle and validate all Ids present in resource bundle belongs to loggedin user.
   * @param {any[]} bundle
   * @param {string} loggedinId
   * @returns {Promise<any>}
   */
  public static async validateRecordIds(bundle: any[], loggedinId: string): Promise<any> {
    log.info("Entering Utility: validateRecordIds()");
    const recordIds = lodash.uniq(lodash.map(bundle, (item) => {
        // id should present in input json as per json schema validation
        return item.id.trim().split(".")[0];
    }));

    if (recordIds.length != 1) {
      log.error("Error occoured as request contains multiple uniqIds");
      return new Error("request contains multiple uniqIds");
    }
    if (recordIds[0] != loggedinId) {
      log.error("Error occoured as request id doesn't belong to loggedIn user");
      return new Error("request id doesn't belong to loggedIn user");
    }
    log.info("Exiting Utility: validateRecordIds()");
    return true;
  }

  /**
   * Convert ["informationSource", "subject", "patient"].reference to camelcase
   * convert any variation of userprofile to "UserProfile" before save
   * @param {any[]} record can be a object or bundle
   * @returns {Promise<any>}
   */
  public static async convertToCamelCase(record: any) {
    log.info("Entering utility: convertToCamelCase()");
    const isBundle = lodash.isArray(record);
    // if not bundle then convert it bundle and update reference
    if (!isBundle) {
      record = [record];
    }
    for (const eachEntry of record) {
      for (const displayAttribute of config.data.displayFields) {
        if (eachEntry.hasOwnProperty(displayAttribute) && eachEntry[displayAttribute].hasOwnProperty("reference")) {
          const serviceObj: any = Utility.getServiceId(eachEntry[displayAttribute].reference);
          if (serviceObj.resourceType.toLowerCase() != "userprofile") {
            log.error("Error occoured as resourceType is not userprofile");
            throw new Error("UserProfile missing in reference");
          }
          eachEntry[displayAttribute].reference = ["UserProfile", serviceObj.id].join("/");
        }
      }
    }
    // if input is bundle then return updated bundle else return object
    log.info("Exiting utility: convertToCamelCase()");
    return isBundle ? record : record[0];
  }

  public static getAttributeValue(obj: object, key: string) {
    log.info("Inside baseService: getAttributeValue()");
    return String(key)
      .split(".")
      .reduce((o, x) => {
        return typeof o == "undefined" || o === null ? o : o[x];
      }, obj);
  }

  /**
   * Create bundle for provided entries.
   * @param {Entry[]} entryArray
   * @param {Link[]} links
   * @returns {Promise<Bundle>}
   */
  public static async createBundle(entryArray: Entry[], links: Link[]) {
    log.info("Inside Utility: createBundle()");
    // Removing total attribute from spec as per new spec
    const bundle: Bundle = new Bundle();
    bundle.resourceType = Constants.BUNDLE;
    bundle.total = entryArray.length;
    bundle.type = Constants.BUNDLE_TYPE;
    bundle.link = links;
    bundle.entry = entryArray;
    return bundle;
  }

  /**
   * Generates the Link URL for the provided query parameters.
   * @param {string} url
   * @param queryParams
   * @param acceptedParams
   * @returns {string}
   */
  public static createLinkUrl(url: string, queryParams: any) {
    log.info("Inside Utility: createLinkUrl()");
    url = url + "?";
    const searchValue = [];
    for (const item in queryParams) {
      // in case date attribute we will get 2 items in array for others it will be 1
      let itemValue = (queryParams[item].length > 1) ? queryParams[item].join("&") : queryParams[item].toString();
      if (config.data.displayFields.indexOf(item) > -1) {
        // if attribute belongs to subject/patient/informationSource then it may have userprofile/id
        itemValue =  (itemValue.indexOf("/") > -1) ? itemValue.split("/")[1] : itemValue;
      }
      searchValue.push([item, itemValue].join("="));
    }
    url += searchValue.join("&");
    log.debug("Link URL: " + url);
    return url;
  }

  /**
   * Parses a string safely to any untyped object. If parsing error occurs it returns null.
   * @param {string} request
   * @returns {any}
   */
  public static safeParse(request: string): any {
    log.info("Inside Utility: safeParse()");
    try {
      return JSON.parse(request);
    } catch (err) {
      log.error("Error parsing this resource.");
      return null;
    }
  }

  public static async getBodyParameters(request: any, toArray?: boolean) {
    const paramObject: any = {};
    for (const eachParam of request.parameter) {
      if (typeof eachParam.name !== "undefined") {
        if (toArray) {
          if (eachParam.valueDate) {
            paramObject[eachParam.name] = eachParam.name.toLowerCase() === "start" ? ["ge" + eachParam.valueDate] : ["le" + eachParam.valueDate];
          } else if (eachParam.valueString) {
            paramObject[eachParam.name] = [eachParam.valueString];
          } else {
            paramObject[eachParam.name] = [eachParam.valueBoolean];
          }
        } else {
          paramObject[eachParam.name] = eachParam.valueDate || eachParam.valueString || eachParam.valueBoolean;
        }
      }
    }
    return paramObject;
  }

  public static async validateDateParameters(...datesToValidate) {
    for (const eachDate of datesToValidate) {
      if (typeof eachDate == "undefined" || new Date(eachDate).toString() == "Invalid Date") {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if the email is valid
   * @param {string} email
   * @returns {boolean} match
   */
  public static validateEmail(email: string): any {
    const emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return (email.length > 0) ? emailPattern.test(String(email).toLowerCase()) : false;
  }

  /**
   * Returns a 6 digit code
   * @returns {string} code
   */
  public static generateSixDigitUniqueCodeFor(identifier: string): string {
    const randomisedIdentifier =
      identifier +
      Math.random()
        .toString(36)
        .substr(2, 15);
    return new Hashids(randomisedIdentifier).encode(1, 2, 3);
  }

  /**
   * Returns html body
   * @param {number} code
   * @returns {string}
   */
  public static generateVerificationCodeMailBody(code: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8' />
            <title>title</title>
        </head>
        <body>
            <span>Dear user, your verification code is ${code}</span>
        </body>
        </html>`;
  }

  /**
   * Returns html body
   * @param {number} code
   * @returns {string}
   */
  public static generateInvitationeMailBody(emailData: any): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8' />
            <title>${emailData.mailSubject}</title>
        </head>
        <body>
            <span>${emailData.message}</span>
            <span>Invitaion Code: ${emailData.code}</span>
        </body>
        </html>`;
  }

  /**
   * Validates metadata with provided details.
   * @param inputMetaDataObject
   * @param existMetaDataObject
   * @returns  {boolean}
   */
  public static validateMetadata(inputMetaDataObject: any, existMetaDataObject: any) {
    log.info("Inside Utility: validateMetadata()");
    inputMetaDataObject = inputMetaDataObject ? inputMetaDataObject : {};
    let result: boolean = true;
    for (const param in inputMetaDataObject) {
      if (inputMetaDataObject[param] != existMetaDataObject[param]) {
        result = false;
        break;
      }
    }
    return result;
  }

  public static createEvent(eventObj: object) {
    const event: any = {};
    const parameter = [];
    const keys = Object.keys(eventObj);
    for (const eachKey of keys) {
      const eachObject = {};
      eachObject["name"] = eachKey;
      eachObject["valueString"] = eventObj[eachKey];
      parameter.push(eachObject);
    }
    event.resourceType = "Parameters";
    event.parameter = parameter;
    return event;
  }

  /**
   * Validates Payload for required parameters.
   */
  public static validatePayload(inviteResource, requiredParams): boolean {
    const getAttributeValue = (obj, key) => {
      return String(key)
        .split(".")
        .reduce((o, x) => {
          return typeof o == "undefined" || o === null ? o : o[x];
        }, obj);
    };

    let inviteStatus = true;
    for (const param of requiredParams) {
      if (!getAttributeValue(inviteResource, param)) {
        inviteStatus = false;
        break;
      }
    }
    return inviteStatus;
  }

  /**
   * Returns current time in minutes.
   */
  public static getCurrentDate(): string {
    return moment().format("YYYY-MM-DD");
  }

  /**
   * Generates future date using period in days.
   * @param {number} period
   * @returns {string}
   */
  public static getExpiryDate(period: number): string {
    const expiry = moment()
      .add(period, "days")
      .format("YYYY-MM-DD");
    return expiry;
  }

  /**
   * Return an array of numbers from a comma separated string
   * @param {string} commaSeparatedString
   * @returns {Number[]}
   */
  public static getArrayFromCommaSeparatedString(commaSeparatedString: string, convertToNumber?: boolean): any[] {
    if (!commaSeparatedString) {
      return [];
    }
    const trimmedArray = commaSeparatedString.split(",").map((stringChar: string) => {
      return convertToNumber ? Number(stringChar.trim()) : stringChar.trim();
    });
    return trimmedArray.filter((elem) => {
      return elem > 0 || isNaN(Number(elem));
    });
  }

  public static async fetchResponse(options: any) {
    try {
      const body = await requestPromise(options);
      return Promise.resolve(body);
    } catch (err) {
      return Promise.reject(new Error("Error: " + err));
    }
  }

  /**
   * Checks if Date has expired.
   * @param {string} date
   * @returns {boolean}
   */
  public static isExpired(date: string): boolean {
    return moment() > moment(date);
  }

  /**
   * Returns object with resource and id from reference string.
   * @param {string} idString
   * @returns {any}
   */
  public static getServiceId(idString: string) {
    const credentail = idString.split("/");
    return {
      resourceType: credentail[0],
      id: credentail[1]
    };
  }

  /**
   * Converts array of parameter objects into single object
   * @param {any[]} paramArr
   * @returns {object}
   */
  public static parseParameters(paramArr: any[]) {
    const response = {};
    for (const i in paramArr) {
      response[paramArr[i]["name"]] = paramArr[i]["valueString"];
    }
    return response;
  }

  /**
   * Checks if object contains non empty values for specific keys
   * @param {any[]} paramArr
   * @returns {object}
   */
  public static hasRequiredAttributes(obj: any, keys: string[]): any {
    const hasAttribute = (key) => lodash.has(obj, key);
    return lodash.every(keys, hasAttribute);
  }

  /**
   * Validates studyCode for Control group and Site specific consent service.
   * @param studyCode
   * @returns  {boolean}
   */
  public static validateStudyCodeFormat(studyCode: string): boolean {
    log.info("Inside validateStudyCodeFormat: Received studyCode is" + studyCode);
    if (studyCode == config.data.controlGroupParams.rwe) {
      return true;
    }
    const pattern = /^[0-9]{3}\-[0-9]\-[0-9]{6}$/;
    const result = pattern.test(studyCode);
    const siteCode = Number(studyCode.split("-")[0]);
    if (isNaN(siteCode) || result == false) {
      return false;
    }
    return true;
  }

  /**
   * Validates validateCohort for Control group and Site specific consent service.
   * @param cohort
   * @returns  {boolean}
   */
  public static validateCohort(cohort: number) {
    log.info("Entered validateCohort method: cohort that came: " + cohort);
    if (
      (cohort == config.data.controlGroupParams.control || cohort == config.data.controlGroupParams.enhanced) &&
      typeof cohort !== "undefined"
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Trims the whitespaces from the object values
   * @param {any} obj
   * @returns  {any}
   */
  public static trimObjectValues(obj: any) {
    if (!obj) {
      return {};
    }
    lodash.forEach(Object.keys(obj), (key) => {
      obj[key] = obj[key].trim();
    });
    return obj;
  }

  public static capitalizeObjectValues(obj: any) {
    if (!obj) {
      return {};
    }
    lodash.forEach(Object.keys(obj), (key) => {
      if (typeof obj[key] === "string") {
        obj[key] = obj[key].toUpperCase();
      }
    });
    return obj;
  }

  /**
   * Capitalize the string elements inside an array
   * @param {string[]} arr
   * @returns {string[]}
   */
  public static capitalizeStringArray(arr: string[]) {
    return lodash.map(arr, (elem) => {
      return elem.toUpperCase();
    });
  }

  // TODO: Code review : Seems like this method should also return an updated queryParams without the pagination attributes -
  // that way, you don't have to explicitly look for them again when processing the search request.
  public static getPaginationInfo(queryParams: any) {
    // As per current design api will return 2000 rows max in one call
    // if we don't pass any value for a key then it will be [""] in query prams
    // queryParams : {"isDeleted":["false"],"limit":[""],"offset":[""]}
    let limit = Constants.FETCH_LIMIT;
    let offset = 0;
    if (queryParams.limit) {
      limit = lodash.toNumber(queryParams.limit[0]);
      if (lodash.isNaN(limit) || limit < 1 || limit > Constants.FETCH_LIMIT) {
        throw new BadRequestResult(errorCode.InvalidInput, "Provided limit is invalid or more than allowed limit");
      }
    }
    if (queryParams.offset) {
      offset = lodash.toNumber(queryParams.offset[0]);
      if (lodash.isNaN(offset) || offset < 1 ) {
        throw new BadRequestResult(errorCode.InvalidInput, "Provided offset is invalid");
      }
      offset *= limit;
    }
    return {
      limit,
      offset
    };
  }
}
