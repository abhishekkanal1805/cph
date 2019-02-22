/**
 * Author: Vadim Galatsky, Ganesh Misal, Vivek K Mishra, Vinaya A V
 * Summary: This file contains all ORM interaction related services like get put post etc
 */
import * as log from "lambda-log";
import * as _ from "lodash";
import { errorCode } from "../../common/constants/error-codes";
import * as config from "../../common/objects/config";
import { BadRequestResult, InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";
import { DataHelperService } from "./dataHelperService";
import { DataValidatorUtility } from "./dataValidatorUtility";
import { UserService } from "./userService";
import { Utility } from "./Utility";

class DataService {
  /**
   * Adds business logic on top of fetchDatabaseRow()
   * @param serviceModel Sequelize model class of the target table.
   * @param {string} contextData AWS context data from incoming request.
   * @param {string} recordId id of the record needs to be fetched.
   * @param {boolean} performUserValidation flag to turn user validation on or off.
   * @param {boolean} fetchDeletedRecord flag to check whether deleted records need to be fetched or not
   * @returns {Promise<any>}
   */

  public static async getRecord(
    serviceModel: any,
    authorizerData: any,
    httpMethod: string,
    recordId: string,
    performUserValidation?: boolean,
    userValidationId?: string,
    fetchDeletedRecord?: boolean
  ): Promise<object> {
    log.info("Entering DataService :: getRecord()");
    if (performUserValidation === undefined) {
      performUserValidation = true;
    }
    if (userValidationId === undefined) {
      userValidationId = "subject.reference";
    }
    if (fetchDeletedRecord === undefined) {
      fetchDeletedRecord = false;
    }
    // check if user has permission to access endpoint or not
    const result = await this.fetchDatabaseRow(recordId, serviceModel);
    log.info("Success:" + recordId + "Info Retrieved");
    // if fetchDeletedRecord is false then return record whose result.meta.isDeleted is false
    if (!fetchDeletedRecord && result.meta.isDeleted) {
      throw new NotFoundResult(errorCode.ResourceNotFound, "Desired record does not exist in the table");
    }
    // get user id from the result resource for validation
    if (performUserValidation) {
      const permissionObj = await UserService.performUserAccessValidation(serviceModel, authorizerData, httpMethod);
      const userIds: string[] = Utility.getUserIds(result, userValidationId);
      await UserService.performUserValidation(permissionObj, userIds[0], authorizerData, httpMethod);
    }
    log.info("getRecord() successful :: Exiting DataService: getRecord()");
    return result;
  }

  /**
   * Service to save records in database after business validations.
   * @param {string} record Request body from POST request.
   * @param {any} serviceModel Sequelize model class of the target table.
   * @param {any} serviceDataResource Model class of the incoming resource.
   * @param {any} authorizerData AWS cognito authorizer data from incoming request.
   * @param {string} httpMethod AWS http method type from incoming request.
   * @param {string} userValidationId Key to use to find the user id from request body.
   * @param {boolean} performUserValidation flag to turn user validation on or off.
   * @returns {Promise<any>}
   */
  public static async saveRecord(
    record: string,
    serviceModel: any,
    serviceDataResource: any,
    authorizerData: any,
    httpMethod: string,
    patientValidationId: string,
    performUserValidation?: boolean,
    userValidationId?: string,
    limitNoOfRecordsToSave?: boolean
  ): Promise<object> {
    log.info("Entering DataService :: saveRecord()");
    if (performUserValidation === undefined) {
      performUserValidation = true;
    }
    // Convert to bundle
    const recordArr: any = Utility.getResourceFromRequest(record, limitNoOfRecordsToSave);
    if (recordArr.length < 1) {
      log.error("getResourceFromRequest() failed :: Exiting DataService :: saveRecord()");
      throw new BadRequestResult(errorCode.InvalidInput, "Provided resource is invalid");
    }
    const deviceIds = _.compact(Utility.findIds(recordArr, "meta.deviceId"));
    if (deviceIds.length > 1) {
      log.error("findIds() failed :: Exiting DataService :: saveRecord()");
      throw new BadRequestResult(errorCode.InvalidRequest, "Provided bundle contains duplicate device id.");
    }
    const resource = { savedRecords: [], errorRecords: [] };
    // Get all unique userids
    const patientIds: any[] = await Utility.getUpdatedRecordAndIds(recordArr, patientValidationId, resource);
    let userIds: any[];
    if (userValidationId) {
      userIds = await Utility.getUniqueIds(recordArr, userValidationId);
    }
    // Do user validation
    let loggedinId = patientIds[0];
    if (performUserValidation) {
      // check if user has permission to access endpoint or not
      const permissionObj = await UserService.performUserAccessValidation(serviceModel, authorizerData, httpMethod);
      await UserService.performMultiUserValidation(
        permissionObj,
        patientIds,
        userIds,
        httpMethod,
        patientValidationId,
        userValidationId,
        resource,
        authorizerData
      );
      loggedinId = permissionObj.loggedinId;
    }
    // Add internal attributes before save
    resource.savedRecords = DataHelperService.convertAllToModelsForSave(resource.savedRecords, serviceModel, serviceDataResource, loggedinId);
    try {
      await serviceModel.bulkCreate(resource.savedRecords);
      log.debug("Resource saved ");
    } catch (err) {
      log.error("Error while saving Record: " + err.stack);
      throw new InternalServerErrorResult(errorCode.ResourceNotSaved, "Error while saving resource");
    }
    log.info("Exiting DataService :: saveRecord()");
    /*
      dataResource contains whole json object, if dataResource is there in attribute
      then return dataResource else return data for all attributes
    */
    resource.savedRecords = _.map(resource.savedRecords, (item) => {
      return item.dataResource ? item.dataResource : item;
    });
    return resource;
  }

  /**
   * Updates record in database.
   * @param {string} record Request body from PUT request.
   * @param {any} serviceModel Sequelize model class of the target table.
   * @param {any} serviceDataResource Model class of the incoming resource.
   * @param {string} contextData AWS context data from incoming request.
   * @param {string} userValidationId Key to use to find the user id from request body.
   * @param {boolean} performUserValidation flag to turn user validation on or off.
   * @returns {Promise<any>}
   */
  public static async updateRecord(
    record: any,
    serviceModel: any,
    serviceDataResource: any,
    authorizerData: any,
    httpMethod: string,
    patientValidationId: string,
    performUserValidation?: boolean,
    userValidationId?: string
  ): Promise<object> {
    log.info("Entering DataService :: updateRecord()");
    if (performUserValidation === undefined || performUserValidation === null) {
      performUserValidation = true;
    }
    const savedBundle: any = [];
    // convert to bundle
    const recordArr: any = Utility.getResourceFromRequest(record);
    if (recordArr.length < 1) {
      log.error("Provided resource is invalid");
      throw new BadRequestResult(errorCode.InvalidInput, "Provided resource is invalid");
    }
    const deviceIds = _.compact(Utility.findIds(recordArr, "meta.deviceId"));
    if (deviceIds.length > 1) {
      log.error("findIds() failed :: Exiting DataService :: saveRecord()");
      throw new BadRequestResult(errorCode.InvalidRequest, "Provided bundle contains duplicate device id.");
    }
    const resource = { savedRecords: [], errorRecords: [] };
    // Checking whether the bundle is having duplicate record ids or not
    const recordIds = _.map(recordArr, "id");
    if (_.uniq(recordIds).length !== recordIds.length) {
      throw new BadRequestResult(errorCode.InvalidInput, "Provided list of ID keys contains duplicates");
    }
    // Get all unique userids
    const patientIds: any[] = await Utility.getUpdatedRecordAndIds(recordArr, patientValidationId, resource);
    let userIds: any[];
    if (userValidationId) {
      userIds = await Utility.getUniqueIds(recordArr, userValidationId);
    }
    // Do user validation
    let loggedinId = patientIds[0];
    if (performUserValidation) {
      const permissionObj = await UserService.performUserAccessValidation(serviceModel, authorizerData, httpMethod);
      await UserService.performMultiUserValidation(
        permissionObj,
        patientIds,
        userIds,
        httpMethod,
        patientValidationId,
        userValidationId,
        resource,
        authorizerData
      );
      loggedinId = permissionObj.loggedinId;
    }
    // Update record attributes before save
    resource.savedRecords = await DataHelperService.convertAllToModelsForUpdate(resource, serviceModel, serviceDataResource, loggedinId);
    const allPromise = [];
    // FIXME: Currently it is doing partial update but we need complete replace
    for (const eachRecord of resource.savedRecords) {
      const thisPromise = serviceModel
        .update(eachRecord, { where: { id: eachRecord.id } })
        .then(() => {
          const item = eachRecord.dataResource ? eachRecord.dataResource : eachRecord;
          savedBundle.push(item);
        })
        .catch((err) => {
          log.error("Error in updating record: ", eachRecord);
          throw new InternalServerErrorResult(errorCode.ResourceNotDeleted, err.message);
        });
      allPromise.push(thisPromise);
    }
    await Promise.all(allPromise);
    log.info("Record saved successfully :: Exiting DataService :: updateRecord()");
    log.info("Exiting DataService :: saveRecord()");
    resource.savedRecords = savedBundle;
    return resource;
  }

  /**
   * Performs business validations on top of deleteDatabaseRow or softDeleteDatabaseRow()
   * @param serviceModel Sequelize model class of the target table.
   * @param {any} serviceDataResource Model class of the incoming resource.
   * @param {string} contextData AWS context data from incoming request.
   * @param {string} recordId id of the record being deleted
   * @param {boolean} performUserValidation flag to turn user validation on or off.
   * @param {string} permanent flag to indicate whether the record needs
   * to be deleted permanently or not
   * @returns {Promise<any>}
   */
  public static async deleteRecord(
    serviceModel: any,
    serviceDataResource: any,
    authorizerData: any,
    httpMethod: string,
    recordId: string,
    performUserValidation?: boolean,
    userValidationId?: string,
    permanent?: string
  ): Promise<object> {
    log.info("Entering DataService :: deleteRecord()");
    let responseObj: any;
    if (performUserValidation === undefined) {
      performUserValidation = true;
    }
    // retrieve the record first
    const result = await this.fetchDatabaseRow(recordId, serviceModel);
    // get user id from the result resource for validation
    if (performUserValidation) {
      // check if user has permission to access endpoint or not
      const permissionObj = await UserService.performUserAccessValidation(serviceModel, authorizerData, httpMethod);
      const userIds: string[] = Utility.getUserIds(result, userValidationId);
      await UserService.performUserValidation(permissionObj, userIds[0], authorizerData, httpMethod);
    }
    // delete permanently or soft delete
    if (permanent === "true") {
      log.info("Deleting item Permanently");
      await this.deleteDatabaseRow(recordId, serviceModel);
    } else if (permanent === "false") {
      log.info("Soft deleting the item" + recordId);
      if (result.meta.isDeleted) {
        throw new NotFoundResult(errorCode.RecordNotFound, "The record doesn't exist or is already deleted");
      }
      result.meta.isDeleted = true;
      await this.softDeleteDatabaseRow(recordId, result, serviceModel, serviceDataResource);
    } else {
      throw new BadRequestResult(errorCode.InvalidQueryParameterValue, "Invalid query parameters");
    }
    responseObj = "Resource was successfully deleted";
    log.info("Exiting DataService: deleteRecord()");
    return responseObj;
  }

  /**
   * Performs business validations on top of deleteDatabaseRow or softDeleteDatabaseRow()
   * @param serviceModel Sequelize model class of the target table.
   * @param {any} serviceDataResource Model class of the incoming resource.
   * @param {string} contextData AWS context data from incoming request.
   * @param {string} recordId id of the record being deleted
   * @param {boolean} performUserValidation flag to turn user validation on or off.
   * @param {string} permanent flag to indicate whether the record needs
   * to be deleted permanently or not
   * @returns {Promise<any>}
   */
  public static async deleteRecords(
    serviceModel: any,
    serviceDataResource: any,
    authorizerData: any,
    httpMethod: string,
    parameters: any,
    endpoint: string,
    performUserValidation?: boolean,
    userValidationId?: string,
    permanent?: string
  ): Promise<object> {
    log.info("Entering DataService :: deleteRecord()");
    let responseObj: any;
    if (performUserValidation === undefined) {
      performUserValidation = true;
    }
    // retrieve the record first
    const result: any = await this.searchDatabaseRows(parameters, serviceModel, endpoint, ["dataResource"]);
    // get user id from the result resource for validation
    if (performUserValidation && result && result.length) {
      // check if user has permission to access endpoint or not
      const permissionObj = await UserService.performUserAccessValidation(serviceModel, authorizerData, httpMethod);
      const userIds: string[] = Utility.getUserIds(result, userValidationId);
      await UserService.performUserValidation(permissionObj, userIds[0], authorizerData, httpMethod);
    } else {
      throw new BadRequestResult(errorCode.NoSearchResultsFounds, "No Records found for given search criteria");
    }
    // delete permanently or soft delete
    if (permanent === "true") {
      log.info("Deleting item Permanently");
      await this.deleteDatabaseRows(parameters, serviceModel, endpoint);
    } else if (permanent === "false") {
      log.info("Soft deleting the item");
      await this.softDeleteDatabaseRows(parameters, result, serviceModel, serviceDataResource, endpoint);
    } else {
      throw new BadRequestResult(errorCode.InvalidQueryParameterValue, "Invalid query parameters");
    }
    responseObj = "Resource was successfully deleted";
    log.info("Exiting DataService: deleteRecord()");
    return responseObj;
  }

  /**
   * Does a search operation for provided criteria.
   * @param serviceModel
   * @param {any} authorizerData
   * @param {string} httpMethod
   * @param searchAttributes
   * @param queryParams
   * @param {string} mandatoryAttribute
   * @param {string} endPoint
   * @param {string[]} attributes
   * @param {boolean} performUserValidation
   * @param {boolean} appendUserProfile
   * @returns {Promise<object[]>}
   */
  public static async searchRecords(
    serviceModel: any,
    authorizerData: any,
    httpMethod: string,
    searchAttributes: any,
    queryParams: any,
    mandatoryAttribute: string,
    endPoint: string,
    attributes: string[],
    performUserValidation?: boolean,
    appendUserProfile?: boolean
  ): Promise<object[]> {
    log.info("Entering DataService :: searchRecords()");
    if (performUserValidation === undefined) {
      performUserValidation = true;
    }
    // If no search parameter is specified then user should get all his data
    if (!queryParams.hasOwnProperty(mandatoryAttribute)) {
      log.debug("Mandatory attribute is added from Cognito");
      queryParams[mandatoryAttribute] = [authorizerData.profile];
    }
    const isParamValid = DataValidatorUtility.validateQueryParams(queryParams, searchAttributes);
    if (!isParamValid) {
      log.error("Query Parameters are not valid");
      throw new BadRequestResult(errorCode.InvalidQueryParameterValue, "Invalid query parameters");
    }
    if (performUserValidation) {
      // check if user has permission to access endpoint or not
      const permissionObj = await UserService.performUserAccessValidation(serviceModel, authorizerData, httpMethod);
      await UserService.performUserValidation(permissionObj, queryParams[mandatoryAttribute][0], authorizerData, httpMethod);
    }
    // add "UserProfile" as prefix to user attribute like informationSource/subject/patient
    if (appendUserProfile) {
      for (const displayAttribute of config.data.displayFields) {
        if (queryParams[displayAttribute]) {
          queryParams[displayAttribute] = [["UserProfile", queryParams[displayAttribute]].join("/")];
        }
      }
    }
    // check added to filter soft deleted records
    if (!queryParams.hasOwnProperty("isDeleted")) {
      queryParams["isDeleted"] = ["false"];
    }
    /*if (config.settings[endPoint].status && config.settings[endPoint].status.defaultValue
      && !queryParams.hasOwnProperty("status")) {
      queryParams["status"] = [config.settings[endPoint].status.defaultValue];
    }*/
    const paginationInfo: any = Utility.getPaginationInfo(queryParams);
    const result = this.searchDatabaseRows(queryParams, serviceModel, endPoint, attributes, paginationInfo);
    log.info("Exiting DataService :: searchRecords()");
    return result;
  }

  /**
   * Makes database call to fetch a single record id from DB.
   * @param id id of the record needs to be fetched.
   * @param {any} serviceModel Sequelize model class of the target table.
   * @returns {object}
   */
  public static async fetchDatabaseRow(id: string, serviceModel: any): Promise<any> {
    log.info("Entering DataService :: fetchDatabaseRow()");
    const results = await this.fetchDatabaseRowStandard(id, serviceModel);
    log.info("Exiting DataService: fetchDatabaseRow() :: Record retrieved successfully");
    /*
      dataResource contains whole json object, if dataResource is there in attribute
      then return dataResource else return data for all attributes
    */
    return results.dataResource ? results.dataResource : results;
  }
  /**
   * Makes database call to fetch a single record id from DB.
   * The models are returned flat instead of looking up dataResource
   * @param id id of the record needs to be fetched.
   * @param {any} serviceModel Sequelize model class of the target table.
   * @returns {object}
   */
  public static async fetchDatabaseRowStandard(id: string, serviceModel: any): Promise<any> {
    log.info("Entering DataService :: fetchDatabaseRowStandard()");
    try {
      const results = await serviceModel.findById(id);
      log.info("Exiting DataService: fetchDatabaseRowStandard() :: Record retrieved successfully");
      return results.dataValues;
    } catch (err) {
      log.error("Error in fetching the record :: " + err);
      throw new BadRequestResult(errorCode.InvalidId, "Missing or Invalid ID");
    }
  }

  /**
   * permanently deletes a record
   * @param {string} id id of the record needs to be deleted.
   * @param serviceModel Sequelize model class of the target table.
   * @returns {Promise<any>}
   */
  public static deleteDatabaseRow(id: string, serviceModel: any): Promise<object> {
    log.info("Entering DataService :: deleteDatabaseRow");
    return serviceModel
      .destroy({ where: { id } })
      .then((rowsDeleted: any) => {
        log.info("Exiting DataService: deleteDatabaseRow() :: Record deleted successfully");
        return rowsDeleted;
      })
      .catch((err) => {
        log.error("Error in fetching the record :: " + err.stack);
        throw new BadRequestResult(errorCode.InvalidId, "Missing or Invalid ID");
      });
  }

  /**
   * permanently deletes multiple records records
   * @param {string} id id of the record needs to be deleted.
   * @param serviceModel Sequelize model class of the target table.
   * @returns {Promise<any>}
   */
  public static deleteDatabaseRows(parameters: any, serviceModel: any, endpoint: string): Promise<object> {
    log.info("Entering DataService :: deleteDatabaseRow");
    const queryObject: any = DataHelperService.prepareSearchQuery(parameters, endpoint, [""]);
    return serviceModel
      .destroy(queryObject)
      .then((rowsDeleted: any) => {
        log.info("Exiting DataService: deleteDatabaseRow() :: Record deleted successfully");
        return rowsDeleted;
      })
      .catch((err) => {
        log.error("Error in fetching the record :: " + err.stack);
        throw new BadRequestResult(errorCode.InvalidId, "Missing or Invalid ID");
      });
  }

  /**
   * Soft Deleting a record. Updates the record with isDeleted flag as true
   * @param {string} id id of the record needs to be deleted.
   * @param recordObject record object which needs to be updated.
   * @param serviceModel Sequelize model class of the target table.
   * @returns {Promise<StringToAnyObjectMap>}
   */
  public static softDeleteDatabaseRow(id: string, recordObject: any, serviceModel: any, serviceDataResource: any): Promise<any> {
    log.info("Entering DataService :: softDeleteDatabaseRow");
    // Default value remove. this works if onMissing is null and undefined both.
    recordObject.id = id;
    const serviceObj: any = Object.assign(new serviceModel(), recordObject);
    if (serviceDataResource) {
      serviceObj.dataResource = Object.assign(new serviceDataResource(), recordObject);
    }
    return serviceModel
      .update(serviceObj.dataValues, { where: { id } })
      .then(() => {
        log.info("Exiting DataService :: softDeleteDatabaseRow");
        return "Resource was successfully deleted";
      })
      .catch((err) => {
        log.debug("Error while updating resource: " + err.stack);
        throw new BadRequestResult(errorCode.ResourceNotDeleted, "Unable to delete resource");
      });
  }

  /**
   * Soft Deleting a record. Updates the record with isDeleted flag as true
   * @param {string} id id of the record needs to be deleted.
   * @param recordObject record object which needs to be updated.
   * @param serviceModel Sequelize model class of the target table.
   * @returns {Promise<StringToAnyObjectMap>}
   */
  public static async softDeleteDatabaseRows(parameters: any, resources: any, serviceModel: any, serviceDataResource: any, endpoint: string): Promise<string> {
    log.info("Entering DataService :: softDeleteDatabaseRow");
    const savedBundle = [];
    const allPromise = [];
    for (const eachRecord of resources) {
      eachRecord.meta.isDeleted = true;
      const serviceObj: any = Object.assign(new serviceModel(), eachRecord);
      if (serviceDataResource) {
        serviceObj.dataResource = Object.assign(new serviceDataResource(), eachRecord);
      }
      const thisPromise = serviceModel
        .update({ dataResource: serviceObj.dataResource }, { where: { id: serviceObj.dataResource.id } })
        .then(() => {
          savedBundle.push(eachRecord.dataResource);
        })
        .catch((err) => {
          log.error("Error in updating record: ", eachRecord);
          throw new InternalServerErrorResult(errorCode.ResourceNotDeleted, err.message);
        });
      allPromise.push(thisPromise);
    }
    await Promise.all(allPromise);
    log.info("Exiting DataService :: softDeleteDatabaseRow");
    return "Resource was successfully deleted";
  }

  /**
   * Generates query as per the provided criteria and interacts with database to get the results
   * @param queryParams
   * @param serviceModel
   * @param {string} endPoint
   * @param {string[]} attributes
   * @returns {Promise<object[]>}
   */
  public static async searchDatabaseRows(queryParams: any, serviceModel: any, endPoint: string, attributes: string[], paginationInfo?): Promise<object[]> {
    log.info("Entering BaseService :: getSearchDatabaseRows()");
    log.debug("Start-DBCall: " + new Date().toISOString());
    const queryObject: any = DataHelperService.prepareSearchQuery(queryParams, endPoint, attributes, paginationInfo);
    const result: any = await serviceModel.findAll(queryObject);
    result.limit = queryObject.limit;
    result.offset = queryObject.offset;
    log.debug("End-DBCall: " + new Date().toISOString());
    log.info("Number of records retrieved: " + result.length);
    log.info("Exiting DataService :: getSearchDatabaseRows()");
    /*
      dataResource contains whole json object, if dataResource is there in attribute
      then return dataResource else return data for all attributes
    */

    const res: any = _.map(result, (d) => {
      return attributes.indexOf("dataResource") > -1 ? d.dataResource : d;
    });
    res.limit = result.limit;
    res.offset = result.offset;
    return res;
  }
}

export { DataService };
