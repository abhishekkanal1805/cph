/**
 * Author: Vivek Mishra, Ganesh , Vadim, Deba
 * Summary: This file contains all helper functions that are needed before making a call to database
 * E.g.: functions to update records or prepare search query
 */
import * as log from "lambda-log";
import * as _ from "lodash";
import * as moment from "moment";
import { Op } from "sequelize";
import * as uuid from "uuid";
import { errorCode } from "../../common/constants/error-codes";
import { BadRequestResult, NotFoundResult } from "../../common/objects/custom-errors";
import { DataService } from "./dataService";
import { Utility } from "./Utility";

class DataHelperService {
  /**
   * Converts the raw payload/resource into typed Model that can be later used to make ORM calls.
   * The provided record is convert to Model and additionally we set the ID and metadata if supported by the Model.
   * @param {any[]} recordsToSave
   * @param serviceModel Type of the Model class to convert to
   * @param serviceDataResource If specified the converter will attempt to convert the entire record into this Type
   * @param {string} userIdKey
   * @returns {any[]} Array of Model created for ORM
   */
  public static convertAllToModelsForSave(recordsToSave: any[], serviceModel: any, serviceDataResource: any, userIdKey: string) {
    log.info("Entering DataHelperService :: convertAllToModelsForSave()");
    const models = [];
    const metaObj = Utility.getRecordMeta(userIdKey, userIdKey);
    for (const thisRecord of recordsToSave) {
      // extracting the clientRequestID from the record if it was provided in request
      const providedClientRequestId = thisRecord.meta && thisRecord.meta.clientRequestId ? thisRecord.meta.clientRequestId : " ";
      const providedDeviceId = thisRecord.meta && thisRecord.meta.deviceId ? thisRecord.meta.deviceId : " ";
      // add new meta data to the provided record
      thisRecord.id = uuid();
      Object.assign(thisRecord.meta, metaObj);
      thisRecord.meta.clientRequestId = providedClientRequestId;
      thisRecord.meta.deviceId = providedDeviceId;
      // create a new Model instance with all the properties from record in payload
      const recordAsModel = this.convertToModel(thisRecord, serviceModel, serviceDataResource);
      models.push(recordAsModel.dataValues);
    }
    log.info("Exiting DataHelperService :: convertAllToModelsForSave()");
    return models;
  }

  /**
   * Fetch recordsToUpdate to be updated from DB and perform business validation
   * @param {any[]} recordsToUpdate array of recordsToUpdate needs to be updated.
   * @param {any} serviceModel serviceModel Sequelize model class of the target table.
   * @param serviceDataResource If specified the converter will attempt to convert the entire record into this Type
   * @param {string} userId user id
   * @returns {Promise<any>}
   */
  public static async convertAllToModelsForUpdate(recordsToUpdate: any[], serviceModel: any, serviceDataResource: any, userId: string) {
    log.info("Entering DataHelperService :: convertAllToModelsForUpdate()");
    const updatedRecords = [];
    for (const thisRecord of recordsToUpdate) {
      // check first whether update is legal. Look for an existing record, check if its soft delete and then confirm correct version
      let existingRecord: any;
      if (serviceDataResource != null) {
        existingRecord = await DataService.fetchDatabaseRow(thisRecord.id, serviceModel);
      } else {
        existingRecord = await DataService.fetchDatabaseRowStandard(thisRecord.id, serviceModel);
      }

      if (existingRecord.meta && existingRecord.meta.isDeleted) {
        throw new NotFoundResult(errorCode.ResourceNotFound, "Desired record does not exist in the table");
      }
      if (thisRecord.meta.versionId != existingRecord.meta.versionId) {
        throw new BadRequestResult(errorCode.VersionIdMismatch, existingRecord.meta.versionId);
      }

      // update is legal, now prepare the Model
      if (thisRecord.meta && thisRecord.meta.clientRequestId) {
        existingRecord.meta.clientRequestId = thisRecord.meta.clientRequestId;
      }
      thisRecord.meta = Utility.getUpdateMetadata(existingRecord.meta, userId, false);
      const recordAsModel = this.convertToModel(thisRecord, serviceModel, serviceDataResource);
      updatedRecords.push(recordAsModel.dataValues);
    }
    log.info("Exiting DataHelperService :: convertAllToModelsForUpdate()");
    return updatedRecords;
  }

  /**
   * Converts raw record/payload into service model
   * if a serviceDataResource type was provided and if the dataResource field is also present then setting
   * @param record
   * @param serviceModel
   * @param serviceDataResource
   * @returns {any}
   */
  public static convertToModel(record: any, serviceModel: any, serviceDataResource: any) {
    const recordAsModel = Object.assign(new serviceModel(), record); // this makes sure all fields other than dataResource are copied
    // if a serviceDataResource type was provided and if the dataResource field is also present then setting
    if (serviceDataResource != null) {
      log.debug("adding [dataResource] to the model");
      recordAsModel.dataResource = Object.assign(new serviceDataResource(), record);
    }
    return recordAsModel;
  }

  /**
   * Decides the boolean condition to be performed between multiple search parameters
   * @param mappedAttribute
   * @param value
   * @param searchObject
   */
  public static createBooleanSearchConditions(mappedAttribute, value, searchObject) {
    log.info("Entering DataHelperService :: createBooleanSearchConditions()");
    if (_.isString(value)) {
      value = value.trim().toLowerCase() === "true";
      searchObject[mappedAttribute.to] = {
        [Op.eq]: value
      };
    }
    log.info("Exiting DataHelperService :: createBooleanSearchConditions()");
    return;
  }

  /**
   * Create date based conditions for database search
   * @param mappedAttribute
   * @param value
   * @param searchObject
   */
  public static createDateSearchConditions(mappedAttribute, value, searchObject) {
    log.info("Entering DataHelperService :: createDateSearchConditions()");
    const operatorMap = {
      ge: Op.gte,
      le: Op.lte,
      gt: Op.gt,
      lt: Op.lt,
      eq: Op.eq
    };
    let condtionType = "OR";
    let condtionOperator = Op.or;
    if (value.length > 1) {
      condtionType = "AND";
      condtionOperator = Op.and;
    }
    searchObject[mappedAttribute.to] = {
      [condtionOperator]: {}
    };
    let values = value;
    if (mappedAttribute.isMultiple) {
      values = condtionType === "OR" ? value[0].split(",") : value;
    }
    for (const item in values) {
      const dateObject = Utility.getPrefixDate(values[item]);
      const isDateTime = moment(dateObject.date, "YYYY-MM-DDTHH:mm:ss.SSSSZ", true).isValid();
      const operation = operatorMap[dateObject.prefix] ? operatorMap[dateObject.prefix] : Op.eq;
      if (isDateTime) {
        if (mappedAttribute.isPeriod) {
          searchObject[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: dateObject.date
                },
                end: {
                  [operatorMap.ge]: dateObject.date
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [operation]: dateObject.date
              }
            }
          ];
        } else {
          searchObject[mappedAttribute.to][condtionOperator][operation] = dateObject.date;
        }
      } else {
        const curentDate = moment(new Date(dateObject.date).toISOString(), "YYYY-MM-DDTHH:mm:ss.SSSSZ").toISOString();
        const nextDate = moment(curentDate)
          .add(1, "days")
          .toISOString();
        if (mappedAttribute.isPeriod) {
          searchObject[Op.or] = [
            {
              [mappedAttribute.periodAttribute]: {
                start: {
                  [operatorMap.le]: curentDate
                },
                end: {
                  [operatorMap.ge]: curentDate
                }
              }
            },
            {
              [mappedAttribute.to]: {
                [operation]: curentDate
              }
            }
          ];
        } else {
          switch (dateObject.prefix) {
            case "gt":
            case "le":
              searchObject[mappedAttribute.to][condtionOperator][operation] = nextDate;
              break;
            case "ge":
            case "lt":
              searchObject[mappedAttribute.to][condtionOperator][operation] = curentDate;
              break;
            default:
              searchObject[mappedAttribute.to][condtionOperator] = {
                [operatorMap.ge]: curentDate,
                [operatorMap.lt]: nextDate
              };
          }
        }
      }
    }
    log.info("Exiting DataHelperService :: createDateSearchConditions()");
  }

  /**
   * Create non-date based search conditions
   * @param mappedAttribute
   * @param value
   * @param searchObject
   */
  public static createGenericSearchConditions(mappedAttribute, value, searchObject) {
    log.info("Entering DataHelperService :: createGenericSearchConditions()");
    if (mappedAttribute.type === "array") {
      const attributes = mappedAttribute.to.split(".");
      let nestedAttributes = {};
      this.getNestedAttributes(attributes.slice(1), value, nestedAttributes, false);
      const arrFlag = attributes[0].indexOf("[*]") > -1;
      let parentAttribute = attributes[0];
      if (arrFlag) {
        parentAttribute = parentAttribute.replace("[*]", "");
        nestedAttributes = [nestedAttributes];
      }
      if (!searchObject[parentAttribute]) {
        searchObject[parentAttribute] = {
          [Op.and]: []
        };
      }
      searchObject[parentAttribute][Op.and].push({
        [Op.contains]: nestedAttributes
      });
    } else {
      value = mappedAttribute.isMultiple ? value.split(",") : value;
      const operator = mappedAttribute.isMultiple ? Op.or : Op.eq;
      searchObject[mappedAttribute.to] = {
        [operator]: value
      };
    }
    log.info("Exiting DataHelperService :: createGenericSearchConditions()");
  }

  /**
   * Create dynamic search query for nested objects
   * @param attributes
   * @param value
   * @param nestedAttributes
   * @param arrFlag
   */
  public static getNestedAttributes(attributes, value, nestedAttributes, arrFlag) {
    if (attributes.length == 1) {
      nestedAttributes[attributes[0]] = value;
      return;
    }
    arrFlag = attributes[0].indexOf("[*]") > -1;
    const attributeName = arrFlag ? attributes[0].replace("[*]", "") : attributes[0];
    nestedAttributes[attributeName] = arrFlag ? [{}] : {};
    const objectMap = arrFlag ? nestedAttributes[attributeName][0] : nestedAttributes[attributeName];
    this.getNestedAttributes(attributes.slice(1), value, objectMap, arrFlag);
  }

  /**
   * Generates search query based on type of search required by considering all business logics.
   * @param searchRequest
   * @param {string} endpoint
   * @returns {object}
   */
  public static prepareSearchQuery(searchRequest, endPoint, attributes?: any, paginationInfo?: any): object {
    log.info("Entering DataHelperService :: prepareSearchQuery()");
    const queryObject: any = {
      where: {},
      order: [["id", "DESC"]]
    };
    const searchObject: any = {};
    if (attributes.length > 0) {
      queryObject.attributes = attributes;
    }
    for (const key in searchRequest) {
      // if "limit", "offset" present in query then we don't map to any attribute, it will only used for pagination
      // TODO: CodeReview : This should be removed - the searchRequest passed into this method should only contain the search parameters.
      if (["limit", "offset"].indexOf(key) > -1) {
        continue;
      }
      const mappedAttribute: any = Utility.getMappedAttribute(key, "map", endPoint);
      // if attribute not present then skip this attribute and move ahead
      if (!mappedAttribute) {
        continue;
      }
      const value = searchRequest[key];
      // Multivalue support only present for date
      // TODO: is the searchRequest assumed to be valid here? could value be an empty array? if so fix the boolean and default
      switch (mappedAttribute.type) {
        case "boolean":
          this.createBooleanSearchConditions(mappedAttribute, value[0], searchObject);
          break;
        case "date":
          this.createDateSearchConditions(mappedAttribute, value, searchObject);
          break;
        default:
          this.createGenericSearchConditions(mappedAttribute, value[0], searchObject);
      }
    }
    queryObject.where = searchObject;
    if (!_.isEmpty(paginationInfo)) {
      queryObject.limit = paginationInfo.limit;
      queryObject.offset = paginationInfo.offset;
    }
    log.info("Generated Query: ", queryObject);
    log.info("Exiting DataHelperService :: prepareSearchQuery()");
    return queryObject;
  }
}

export { DataHelperService };
