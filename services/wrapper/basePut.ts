/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { RequestParams, UpdateMetaDataElements, UpdateRequestParams } from "../../common/interfaces/baseInterfaces";
import { BadRequestResult, ForbiddenResult, NotFoundResult } from "../../common/objects/custom-errors";
import { tableNameToResourceTypeMapping } from "../../common/objects/tableNameToResourceTypeMapping";
import { GenericResponse } from "../common/genericResponse";
import { Utility } from "../common/Utility";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
import { DataTransform } from "../utilities/dataTransform";
import { JsonParser } from "../utilities/jsonParser";
import { SharingRulesHelper } from "../utilities/sharingRulesHelper";
import { RequestValidator } from "../validators/requestValidator";

export class BasePut {
  /**
   * For all clinical resource patientElement hold the profile reference to who the record belongs,
   * requestorId points to the logged in user.
   * For use with FHIR resources we would set the informationSourceElement same as patientElement
   * @param {*} requestPayload
   * @param {T} payloadModel
   * @param {*} payloadDataResourceModel
   * @param {RequestParams} requestParams
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async updateResource<T>(
    requestPayload: any,
    payloadModel: T,
    payloadDataResourceModel: any,
    requestParams: RequestParams
  ): Promise<GenericResponse<T>> {
    log.info("Entering BasePut :: updateResource()");
    // validate request payload
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    const total = requestPayload.length;
    const model = payloadModel as any;
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(Constants.ID, []);
    keysToFetch.set(requestParams.ownerElement, []);
    keysToFetch.set(requestParams.informationSourceElement, []);

    // additional reference validataion if present
    const isValidReferenceElement: boolean = requestParams.referenceValidationModel && requestParams.referenceValidationElement ? true : false;
    if (isValidReferenceElement) {
      keysToFetch.set(requestParams.referenceValidationElement, []);
    }
    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Device, Id, User Keys retrieved successfully :: updateResource()");

    // perform primaryKeyIds validation
    const primaryKeyIds = [...new Set(keysMap.get(Constants.ID))];
    RequestValidator.validateLength(primaryKeyIds, total);
    log.info("unique primaryKeyIds validation is successful :: updateResource()");

    // perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.info("DeviceId validation is successful :: updateResource()");

    const queryObject = { id: primaryKeyIds };
    let whereClause: any = {};
    // perform user validation for owner reference
    const ownerReferences = [...new Set(keysMap.get(requestParams.ownerElement))];
    RequestValidator.validateSingularUserReference(ownerReferences);
    log.info(`OwnerElement: ${requestParams.ownerElement} validation is successful :: updateResource()`);

    // perform user validation for informationSource reference
    const informationSourceReferences = [...new Set(keysMap.get(requestParams.informationSourceElement))];
    RequestValidator.validateSingularUserReference(informationSourceReferences);
    // Sharing rules will validate connection between loggedIn user and recordOwner for access permission
    // Additional check added to validate InformationSource which must be an active user
    if (informationSourceReferences[0]) {
      const researchSubjectProfiles: any = await AuthService.getResearchSubjectProfiles(informationSourceReferences[0]);
      const informationSourceReferenceValue = researchSubjectProfiles[informationSourceReferences[0]]
        ? researchSubjectProfiles[informationSourceReferences[0]]
        : informationSourceReferences[0];
      await DataFetch.getUserProfile([informationSourceReferenceValue.split(Constants.USERPROFILE_REFERENCE)[1]]);
    }
    log.info(`InformationSourceElement: ${requestParams.informationSourceElement} validation is successful :: updateResource()`);

    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    const connection = await AuthService.authorizeConnectionBasedSharingRules({
      requester: requestParams.requestorProfileId,
      ownerReference: ownerReferences[0],
      resourceType: serviceName,
      accessType: Constants.ACCESS_EDIT,
      resourceActions: requestParams.resourceActions,
      ownerType: requestParams.ownerType
    });
    // For system user/ loggedin user to get his own record we won't add sharing rules
    if (connection.length > 0) {
      // If logged in user trying to updated others records then validate with filtered primaryKeyIds based on sharing rules
      whereClause = SharingRulesHelper.addSharingRuleClause(queryObject, connection[0], payloadModel, Constants.ACCESS_EDIT);
      if (_.isEmpty(whereClause[Op.and])) {
        log.error("Sharing rules not present for requested user :: updateResource()");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
    } else {
      // If logged in user type is system/patient then validate with primaryKeyIds
      whereClause = queryObject;
    }
    log.info("User Authorization is successful :: updateResource()");
    const options = { where: whereClause, attributes: [Constants.ID] };
    // Get filtered recordsIds after applying sharing rules
    let filteredPrimaryKeyIds: any = await DAOService.search(payloadModel, options);
    filteredPrimaryKeyIds = _.map(filteredPrimaryKeyIds, Constants.ID);
    if (!filteredPrimaryKeyIds.length) {
      log.error("ValidIds list is empty :: updateResource()");
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
    // fetch unique reference ids of referenceValidationElement which needs to be validated
    let uniquesReferenceIds = [];
    if (isValidReferenceElement) {
      uniquesReferenceIds = [...new Set(keysMap.get(requestParams.referenceValidationElement))].filter(Boolean);
      uniquesReferenceIds = uniquesReferenceIds.map((referenceId) => {
        return referenceId.split(Constants.FORWARD_SLASH)[1];
      });
    }
    const updateRequestParams: UpdateRequestParams = {
      requestLogRef: requestParams.requestLogRef,
      requestorProfileId: requestParams.requestorProfileId,
      requestPrimaryIds: filteredPrimaryKeyIds,
      referenceValidationModel: requestParams.referenceValidationModel,
      referenceValidationElement: requestParams.referenceValidationElement,
      uniquesReferenceIds,
      ownerElement: requestParams.ownerElement
    };
    const result = await BasePut.bulkUpdate(requestPayload, payloadModel, payloadDataResourceModel, updateRequestParams);
    log.info("Payload updated successfully :: updateResource()");
    return result;
  }

  /**
   * @param {*} requestPayload
   * @param {T} model
   * @param {*} modelDataResource
   * @param {RequestParams} requestParams
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async bulkUpdate(requestPayload, model, modelDataResource, requestParams: UpdateRequestParams) {
    log.info("Entering BasePut :: bulkUpdate()");
    let parentOwnerElement;
    if (requestParams.ownerElement) {
      parentOwnerElement = requestParams.ownerElement.split(Constants.DOT_VALUE)[0];
    }
    // validate primaryKeys of all the records in request payload
    const validPrimaryIds = await DataFetch.getValidIds(model, requestParams.requestPrimaryIds, parentOwnerElement);
    log.info("Valid primary Ids fetched successfully :: bulkUpdate()");
    const result = { savedRecords: [], errorRecords: [] };
    // creating an all promise array which can be executed in parallel.
    const allPromise = [];

    // looping over all records to filter good vs bad records
    for (const idx in requestPayload) {
      const record = requestPayload[idx];
      const existingRecord: any = validPrimaryIds.find((validPrimaryId) => {
        return validPrimaryId.id === record.id;
      });
      if (_.isEmpty(existingRecord)) {
        log.error("Record not exists for id : " + record.id);
        const notFoundResult = new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
        notFoundResult.clientRequestId = record.meta.clientRequestId;
        result.errorRecords.push(notFoundResult);
        continue;
      }
      // check if loggedin user trying to modify record owner
      if (requestParams.ownerElement) {
        // Get Record owner from RequestPayload
        const keysToFetch = new Map();
        keysToFetch.set(requestParams.ownerElement, []);
        let keysMap = JsonParser.findValuesForKeyMap([record], keysToFetch);
        const payloadRecordOwner = keysMap.get(requestParams.ownerElement)[0];
        // Get Record owner from Existing Record for that id
        const existingRecordKeysToFetch = new Map();
        existingRecordKeysToFetch.set(requestParams.ownerElement, []);
        existingRecordKeysToFetch.set(parentOwnerElement, []);
        keysMap = JsonParser.findValuesForKeyMap([existingRecord.dataValues], existingRecordKeysToFetch);
        const existingRecordOwner = keysMap.get(parentOwnerElement)[0] || keysMap.get(requestParams.ownerElement)[0];
        if (existingRecordOwner != payloadRecordOwner) {
          log.error("Loggedin user is trying to update owner element for record id : " + record.id);
          const badRequest = new BadRequestResult(errorCodeMap.InvalidElement.value, errorCodeMap.InvalidElement.description + requestParams.ownerElement);
          badRequest.clientRequestId = record.meta.clientRequestId;
          result.errorRecords.push(badRequest);
          continue;
        }
      }
      // validate versionId in putRequest
      if (existingRecord.meta.versionId != record.meta.versionId) {
        log.error("meta versionId mismatch for record id : " + record.id);
        const badRequest = new BadRequestResult(errorCodeMap.InvalidResourceVersion.value, existingRecord.meta.versionId);
        badRequest.clientRequestId = record.meta.clientRequestId;
        result.errorRecords.push(badRequest);
        continue;
      }
      let validReferenceIds;
      const isValidateReferences: boolean =
        requestParams.referenceValidationModel && requestParams.referenceValidationElement && requestParams.uniquesReferenceIds;
      if (isValidateReferences) {
        // check if uniqueReferenceIds exists in DB for referenceValidationModel
        validReferenceIds = await DataFetch.getValidIds(requestParams.referenceValidationModel, requestParams.uniquesReferenceIds);
        validReferenceIds = Utility.findIds(validReferenceIds, Constants.ID).map((eachId) => eachId);
      }
      // if isValidateReferences = true then only referenceValidationAttribute values are validated
      // validate uniqueReferenceIds against referenceValidationModel
      if (
        isValidateReferences &&
        record.hasOwnProperty(requestParams.referenceValidationElement.split(Constants.DOT_VALUE)[0]) &&
        !validReferenceIds.includes(record[requestParams.referenceValidationElement.split(Constants.DOT_VALUE)[0]].reference.split(Constants.FORWARD_SLASH)[1])
      ) {
        log.error("reference model validation failed for record id : " + record.id);
        const badRequest = new BadRequestResult(
          errorCodeMap.InvalidReference.value,
          errorCodeMap.InvalidReference.description + requestParams.referenceValidationElement.split(Constants.DOT_VALUE)[0]
        );
        badRequest.clientRequestId = record.meta.clientRequestId;
        result.errorRecords.push(badRequest);
        continue;
      }
      // We proceed with creation of metadata and adding record to be saved if its version ID is correct
      const updatedResourceMetaData: UpdateMetaDataElements = {
        versionId: existingRecord.meta.versionId,
        created: existingRecord.meta.created,
        createdBy: existingRecord.meta.createdBy,
        lastUpdatedBy: requestParams.requestorProfileId,
        isDeleted: false,
        requestLogRef: requestParams.requestLogRef,
        clientRequestId: existingRecord.meta.clientRequestId,
        deviceId: existingRecord.meta.deviceId,
        source: existingRecord.meta.source
      };
      const resultPromise = this.updateModelAndSave(record, model, modelDataResource, updatedResourceMetaData)
        .then((updatedRecord) => {
          result.savedRecords.push(updatedRecord);
        })
        .catch((error) => {
          result.errorRecords.push(error);
        });
      allPromise.push(resultPromise);
    }
    // promise all to run in parallel.
    log.info("Firing bulk update all promises :: bulkUpdate()");
    await Promise.all(allPromise);
    log.info("Exiting BasePut :: bulkUpdate()");
    return result;
  }

  /**
   * @param {*} requestPayload
   * @param {T} model
   * @param {*} modelDataResource
   * @param {} resourceMetaData
   * @returns {} result
   */
  public static async updateModelAndSave(requestPayload: any, model: any, modelDataResource: any, resourceMetaData: UpdateMetaDataElements) {
    log.info("Entering BasePut :: updateModelAndSave()");
    requestPayload.meta = DataTransform.getUpdateMetaData(requestPayload, resourceMetaData);
    requestPayload = DataTransform.convertToModel(requestPayload, model, modelDataResource).dataValues;
    const result = DAOService.update(model, requestPayload);
    log.info("Exiting BasePut :: updateModelAndSave()");
    return result;
  }

  /**
   * @param {*} requestPayload
   * @param {T} model
   * @param {*} modelDataResource
   * @param {RequestParams} requestParams
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async updateResourceWithoutAuthorization<T>(
    requestPayload: any,
    payloadModel: T,
    payloadDataResourceModel: any,
    requestParams: RequestParams
  ): Promise<GenericResponse<T>> {
    log.info("Entering BasePut :: updateResource()");
    // validate request payload
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    const total = requestPayload.length;
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(Constants.ID, []);
    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Device, Id, User Keys retrieved successfully :: updateResource()");

    // perform primaryKeyIds validation
    const primaryKeyIds = [...new Set(keysMap.get(Constants.ID))];
    RequestValidator.validateLength(primaryKeyIds, total);
    log.info("unique primaryKeyIds validation is successful :: updateResource()");

    // perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.info("DeviceId validation is successful :: updateResource()");
    const whereClause: any = { id: primaryKeyIds };
    const options = { where: whereClause, attributes: [Constants.ID] };
    // Get filtered recordsIds after applying sharing rules
    let filteredPrimaryKeyIds: any = await DAOService.search(payloadModel, options);
    filteredPrimaryKeyIds = _.map(filteredPrimaryKeyIds, Constants.ID);
    if (!filteredPrimaryKeyIds.length) {
      log.error("ValidIds list is empty :: updateResource()");
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
    const updateRequestParams: UpdateRequestParams = {
      requestLogRef: requestParams.requestLogRef,
      requestorProfileId: requestParams.requestorProfileId,
      requestPrimaryIds: filteredPrimaryKeyIds,
      referenceValidationModel: requestParams.referenceValidationModel,
      referenceValidationElement: requestParams.referenceValidationElement,
      ownerElement: requestParams.ownerElement
    };
    const result = await BasePut.bulkUpdate(requestPayload, payloadModel, payloadDataResourceModel, updateRequestParams);
    log.info("Payload updated successfully :: updateResource()");
    return result;
  }

  /**
   * @param {*} requestPayload
   * @param {T} model
   * @param {*} modelDataResource
   * @param {RequestParams} requestParams
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async updateResourcePolicyManagerBased<T>(
    requestPayload: any,
    payloadModel: T,
    payloadDataResourceModel: any,
    requestParams: RequestParams
  ): Promise<GenericResponse<T>> {
    log.info("Entering BasePut :: updateResourcePolicyManagerBased()");
    // validate request payload
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    const total = requestPayload.length;
    const model = payloadModel as any;
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(Constants.ID, []);
    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Device, Id, User Keys retrieved successfully :: updateResourcePolicyManagerBased()");

    // perform primaryKeyIds validation
    const primaryKeyIds = [...new Set(keysMap.get(Constants.ID))];
    RequestValidator.validateLength(primaryKeyIds, total);
    log.info("unique primaryKeyIds validation is successful :: updateResourcePolicyManagerBased()");

    // perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.info("DeviceId validation is successful :: updateResourcePolicyManagerBased()");
    const queryObject = { id: primaryKeyIds };
    let whereClause: any = {
      [Op.or]: []
    };
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    log.info("Calling authorizePolicyManagerBased() :: updateResourcePolicyManagerBased()");
    const authResponse = await AuthService.authorizePolicyManagerBased(
      requestParams.requestorProfileId,
      serviceName,
      Constants.ACCESS_EDIT,
      requestParams.resourceScopeMap,
      requestParams.subjectReferences,
      requestParams.resourceActions
    );
    if (authResponse && !_.isEmpty(authResponse.authorizedConnections)) {
      if (authResponse.authorizedConnections.length > 0) {
        let sharingRulesClausePresent: boolean = false;
        authResponse.authorizedConnections.forEach((eachConnection: any) => {
          const sharingRulesClause = SharingRulesHelper.addSharingRuleClause(queryObject, eachConnection, model, Constants.ACCESS_EDIT);
          if (!_.isEmpty(sharingRulesClause[Op.and])) {
            whereClause[Op.or].push(sharingRulesClause);
            sharingRulesClausePresent = true;
          }
        });
        if (!sharingRulesClausePresent) {
          log.info("Sharing rules not present for requested users");
          throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
        }
      }
    } else {
      whereClause = queryObject;
    }
    log.info("User Authorization is successful :: updateResourcePolicyManagerBased()");
    const options = { where: whereClause, attributes: [Constants.ID] };
    // Get filtered recordsIds after applying sharing rules
    let filteredPrimaryKeyIds: any = await DAOService.search(payloadModel, options);
    filteredPrimaryKeyIds = _.map(filteredPrimaryKeyIds, Constants.ID);
    if (!filteredPrimaryKeyIds.length) {
      log.error("ValidIds list is empty :: updateResource()");
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
    const updateRequestParams: UpdateRequestParams = {
      requestLogRef: requestParams.requestLogRef,
      requestorProfileId: requestParams.requestorProfileId,
      requestPrimaryIds: filteredPrimaryKeyIds,
      referenceValidationModel: requestParams.referenceValidationModel,
      referenceValidationElement: requestParams.referenceValidationElement,
      ownerElement: requestParams.ownerElement
    };
    const result = await BasePut.bulkUpdate(requestPayload, payloadModel, payloadDataResourceModel, updateRequestParams);
    log.info("Payload updated successfully :: updateResourcePolicyManagerBased()");
    return result;
  }

  /**
   * @param {*} requestPayload
   * @param {T} model
   * @param {*} modelDataResource
   * @param {RequestParams} requestParams
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async updateResourceScopeBased<T>(
    requestPayload: any,
    payloadModel: T,
    payloadDataResourceModel: any,
    requestParams: RequestParams
  ): Promise<GenericResponse<T>> {
    log.info("Entering BasePut :: updateResourceScopeBased()");
    // validate request payload
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    const total = requestPayload.length;
    const model = payloadModel as any;
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(Constants.ID, []);
    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Device, Id, User Keys retrieved successfully :: updateResourceScopeBased()");

    // perform primaryKeyIds validation
    const primaryKeyIds = [...new Set(keysMap.get(Constants.ID))];
    RequestValidator.validateLength(primaryKeyIds, total);
    log.info("unique primaryKeyIds validation is successful :: updateResourceScopeBased()");

    // perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.info("DeviceId validation is successful :: updateResourceScopeBased()");
    const whereClause: any = { id: primaryKeyIds };
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    let resourceScope: string[] = [];
    // concatenating all resources in the map values
    Array.from(requestParams.resourceScopeMap.values()).forEach((scope: string[]) => {
      resourceScope = resourceScope.concat(scope);
    });
    const authResponse = await AuthService.authorizePolicyBased(
      requestParams.requestorProfileId,
      requestParams.resourceActions,
      resourceScope,
      serviceName,
      Constants.ACCESS_EDIT
    );
    if (!authResponse.fullAuthGranted && _.isEmpty(authResponse.authorizedResourceScopes)) {
      log.info("fullAuthGranted was not granted, authorizedResourceScopes are empty, This means you have no access to get this resource.");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    log.info("User Authorization is successful :: updateResourceScopeBased()");
    const options = { where: whereClause, attributes: [Constants.ID] };
    // Get filtered recordsIds after applying sharing rules
    let filteredPrimaryKeyIds: any = await DAOService.search(payloadModel, options);
    filteredPrimaryKeyIds = _.map(filteredPrimaryKeyIds, Constants.ID);
    if (!filteredPrimaryKeyIds.length) {
      log.error("ValidIds list is empty :: updateResourceScopeBased()");
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
    const updateRequestParams: UpdateRequestParams = {
      requestLogRef: requestParams.requestLogRef,
      requestorProfileId: requestParams.requestorProfileId,
      requestPrimaryIds: filteredPrimaryKeyIds,
      referenceValidationModel: requestParams.referenceValidationModel,
      referenceValidationElement: requestParams.referenceValidationElement,
      ownerElement: requestParams.ownerElement
    };
    const result = await BasePut.bulkUpdate(requestPayload, payloadModel, payloadDataResourceModel, updateRequestParams);
    log.info("Payload updated successfully :: updateResourceScopeBased()");
    return result;
  }

  /**
   * @param {*} requestPayload
   * @param {T} model
   * @param {*} modelDataResource
   * @param {RequestParams} requestParams
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async updateResourceMultipleOwnerBased<T>(
    requestPayload: any,
    payloadModel: T,
    payloadDataResourceModel: any,
    requestParams: RequestParams
  ): Promise<GenericResponse<T>> {
    log.info("Entering BasePut :: updateResource()");
    // validate request payload
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    const total = requestPayload.length;
    const model = payloadModel as any;
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(Constants.ID, []);
    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Device, Id, User Keys retrieved successfully :: updateResourceMultipleOwnerBased()");

    // perform primaryKeyIds validation
    const primaryKeyIds = [...new Set(keysMap.get(Constants.ID))];
    RequestValidator.validateLength(primaryKeyIds, total);
    log.info("unique primaryKeyIds validation is successful :: updateResourceMultipleOwnerBased()");

    // perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.info("DeviceId validation is successful :: updateResourceMultipleOwnerBased()");
    const whereClause: any = { id: primaryKeyIds };
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    const authResponse = await AuthService.authorizeMultipleOwnerBased(
      requestParams.requestorProfileId,
      requestParams.subjectReferences,
      serviceName,
      Constants.ACCESS_EDIT,
      requestParams.resourceActions
    );
    if (!authResponse.fullAuthGranted && (_.isEmpty(authResponse.authorizedRequestees) && _.isEmpty(authResponse.authorizedConnections))) {
      log.info(
        "fullAuthGranted was not granted, authorizedRequestees are empty or authorizedConnections are empty, This means you have no access to get this resource."
      );
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    log.info("User Authorization is successful :: updateResourceMultipleOwnerBased()");
    const options = { where: whereClause, attributes: [Constants.ID] };
    // Get filtered recordsIds after applying sharing rules
    let filteredPrimaryKeyIds: any = await DAOService.search(payloadModel, options);
    filteredPrimaryKeyIds = _.map(filteredPrimaryKeyIds, Constants.ID);
    if (!filteredPrimaryKeyIds.length) {
      log.error("ValidIds list is empty :: updateResourceMultipleOwnerBased()");
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
    const updateRequestParams: UpdateRequestParams = {
      requestLogRef: requestParams.requestLogRef,
      requestorProfileId: requestParams.requestorProfileId,
      requestPrimaryIds: filteredPrimaryKeyIds,
      referenceValidationModel: requestParams.referenceValidationModel,
      referenceValidationElement: requestParams.referenceValidationElement,
      ownerElement: requestParams.ownerElement
    };
    const result = await BasePut.bulkUpdate(requestPayload, payloadModel, payloadDataResourceModel, updateRequestParams);
    log.info("Payload updated successfully :: updateResourceMultipleOwnerBased()");
    return result;
  }
}
