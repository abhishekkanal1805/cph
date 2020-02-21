/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import * as uuid from "uuid";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ResourceCategory } from "../../common/constants/resourceCategory";
import { MetaDataElements, RequestParams } from "../../common/interfaces/baseInterfaces";
import { ForbiddenResult, InternalServerErrorResult } from "../../common/objects/custom-errors";
import { tableNameToResourceTypeMapping } from "../../common/objects/tableNameToResourceTypeMapping";
import { GenericResponse } from "../common/genericResponse";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
import { DataTransform } from "../utilities/dataTransform";
import { JsonParser } from "../utilities/jsonParser";
import { ReferenceValidator } from "../validators/referenceValidator";
import { RequestValidator } from "../validators/requestValidator";

export class BasePost {
  /**
   * For all clinical resource patientElement hold the profile reference to who the record belongs,
   * informationSourceElement holds the profile reference to the someone who is creating the patient data,
   * requestorId points to the logged in user.
   * For use with FHIR resources we would set the informationSourceElement same as patientElement
   * TODO: should we disallow nulls for patientElement and informationSourceElement
   * @param {*} requestPayload
   * @param {T} payloadModel
   * @param {*} payloadDataResourceModel
   * @param {RequestParams} requestParams
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async saveResource<T>(
    requestPayload: any,
    payloadModel: T,
    payloadDataResourceModel: any,
    requestParams: RequestParams
  ): Promise<GenericResponse<T>> {
    log.info("Entering BasePost :: saveResource()");
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    log.info("Record Array created successfully in :: saveResource()");
    const model = payloadModel as any;
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    const isDefinitionalResource = model.resourceCategory ? model.resourceCategory == ResourceCategory.DEFINITION : Constants.FALSE;

    // for non-Definitional resource the owner & informationSource both references must be provided
    if (!isDefinitionalResource) {
      if (!requestParams.ownerElement || !requestParams.informationSourceElement) {
        log.error(
          `Resource category is non-Definitional and ownerElement is ${requestParams.ownerElement} and RequestParams.ownerElement is ${
            requestParams.informationSourceElement
          }`
        );
        throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
      }
      keysToFetch.set(requestParams.ownerElement, []);
      keysToFetch.set(requestParams.informationSourceElement, []);
    }
    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Device and User Keys retrieved successfully :: saveResource()");

    // perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.info("DeviceId validation is successful :: saveResource()");

    if (!isDefinitionalResource) {
      // perform user validation for owner reference
      const ownerReferences = [...new Set(keysMap.get(requestParams.ownerElement))].filter(Boolean);
      RequestValidator.validateSingularUserReference(ownerReferences);
      log.info(`OwnerElement: ${requestParams.ownerElement} validation is successful :: saveResource()`);

      // perform user validation for informationSource reference
      const informationSourceReferences = [...new Set(keysMap.get(requestParams.informationSourceElement))].filter(Boolean);
      RequestValidator.validateSingularUserReference(informationSourceReferences);
      log.info(`InformationSourceElement: ${requestParams.informationSourceElement} validation is successful :: saveResource()`);

      const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
      // TODO: If this returns a connection should we check the sharing rules to make sure if the requester is authorized to perform this action
      // we are here means we have exactly one owner and infoSource reference
      await AuthService.authorizeRequestSharingRules({
        requester: requestParams.requestorProfileId,
        informationSourceReference: informationSourceReferences[0],
        ownerReference: ownerReferences[0],
        resourceType: serviceName,
        accessType: Constants.ACCESS_EDIT,
        resourceActions: requestParams.resourceActions,
        ownerType: requestParams.ownerType
      });
      log.info("User Authorization is successful ");
    } else {
      await DataFetch.getUserProfile([requestParams.requestorProfileId]);
      log.info("User Authorization is successful ");
    }

    const validatedResources = await ReferenceValidator.validateReference(
      requestPayload,
      requestParams.referenceValidationModel,
      requestParams.referenceValidationElement
    );

    const resourceMetaData: MetaDataElements = {
      createdBy: requestParams.requestorProfileId,
      lastUpdatedBy: requestParams.requestorProfileId,
      requestLogRef: requestParams.requestLogRef
    };
    const saveResponse: GenericResponse<T> = new GenericResponse<T>();
    saveResponse.errorRecords = validatedResources.errorResults;
    if (validatedResources.validResources.length > 0) {
      log.info("Calling prepareModelAndSave method ");
      const savedResources = await BasePost.prepareModelAndSave(validatedResources.validResources, payloadModel, payloadDataResourceModel, resourceMetaData);
      saveResponse.savedRecords = savedResources;
    }
    log.info("Exiting BasePost :: saveResource()");
    return saveResponse;
  }

  /**
   * The function creates meta and uuid for all resources, converts all resources to Model and performs bulk save.
   * Either all will be saved or nothing. If save fails exception is thrown by DAO and will not return any error records.
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @param {MetaDataElements} resourceMetaData Resource metadata for save record
   * @return {Promise<any>}
   */
  public static async prepareModelAndSave(requestPayload: any, model: any, modelDataResource: any, resourceMetaData: MetaDataElements) {
    log.info("Entering BasePost :: prepareModelAndSave()");
    requestPayload.forEach((record, index) => {
      record.meta = DataTransform.getRecordMetaData(record, resourceMetaData);
      record.id = uuid();
      record = DataTransform.convertToModel(record, model, modelDataResource).dataValues;
      requestPayload[index] = record;
    });
    await DAOService.bulkSave(requestPayload, model);
    log.info("Bulk Save successfully :: saveRecord()");
    const savedRecords = requestPayload.map((record) => {
      return record.dataResource;
    });
    log.info("Exiting BasePost :: prepareModelAndSave()");
    return savedRecords;
  }

  /**
   * For use with services which has multiple owners. This function performs policy based authorization for scoped references.
   * @param {*} requestPayload
   * @param {T} payloadModel
   * @param {*} payloadDataResourceModel
   * @param {RequestParams} requestParams
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async saveResourceScopeBased<T>(
    requestPayload: any,
    payloadModel: T,
    payloadDataResourceModel: any,
    requestParams: RequestParams
  ): Promise<GenericResponse<T>> {
    log.info("Entering BasePost :: saveResourceScopeBased()");
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    log.info("Record Array created successfully in :: saveResourceScopeBased()");
    const model = payloadModel as any;
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Device and User Keys retrieved successfully :: saveResourceScopeBased()");

    // perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.info("DeviceId validation is successful :: saveResourceScopeBased()");
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
    log.info("User Authorization is successful ");
    // validate references
    const validatedResources = await ReferenceValidator.validateReference(
      requestPayload,
      requestParams.referenceValidationModel,
      requestParams.referenceValidationElement
    );
    // prepare meta data object
    const resourceMetaData: MetaDataElements = {
      createdBy: requestParams.requestorProfileId,
      lastUpdatedBy: requestParams.requestorProfileId,
      requestLogRef: requestParams.requestLogRef
    };
    const saveResponse: GenericResponse<T> = new GenericResponse<T>();
    saveResponse.errorRecords = validatedResources.errorResults;
    if (validatedResources.validResources.length > 0) {
      log.info("Calling prepareModelAndSave method ");
      const savedResources = await BasePost.prepareModelAndSave(validatedResources.validResources, payloadModel, payloadDataResourceModel, resourceMetaData);
      saveResponse.savedRecords = savedResources;
    }
    log.info("Exiting BasePost :: saveResourceScopeBased()");
    return saveResponse;
  }
}
