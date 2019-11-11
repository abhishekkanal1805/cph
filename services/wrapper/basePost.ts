import * as log from "lambda-log";
import * as uuid from "uuid";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ResourceCategory } from "../../common/constants/resourceCategory";
import { MetaDataElements, RequestParams } from "../../common/interfaces/baseInterfaces";
import { InternalServerErrorResult } from "../../common/objects/custom-errors";
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
  public static async saveResource<T>(requestPayload, payloadModel: T, payloadDataResourceModel, requestParams: RequestParams): Promise<GenericResponse<T>> {
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    log.info("Record Array created succesfully in :: saveResource()");
    const model = payloadModel as any;
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    const isDefinitionalResource = model.resourceCategory ? model.resourceCategory == ResourceCategory.DEFINITION : Constants.FALSE;
    // If Resource is non-Definitional, then there will be validation for ownerElement & informationSourceElement
    if (!isDefinitionalResource) {
      if (!requestParams.ownerElement || !requestParams.informationSourceElement) {
        log.error(
          `Resource category is non-Definitional and ownerElement is ${requestParams.ownerElement} and RequestParams.ownerElement is ${
            requestParams.informationSourceElement
          }`
        );
        throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
        // Both should be there else throw error, discuss error type with team
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
      log.info("OwnerElement validation is successful :: saveResource()");

      // perform user validation for owner reference
      const informationSourceReferences = [...new Set(keysMap.get(requestParams.informationSourceElement))].filter(Boolean);
      RequestValidator.validateSingularUserReference(informationSourceReferences);
      log.info("InformationSourceElement validation is successful :: saveResource()");
      const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
      await AuthService.authorizeRequest(
        requestParams.requestorProfileId,
        informationSourceReferences[0],
        ownerReferences[0],
        serviceName,
        Constants.ACCESS_EDIT,
        requestParams.ownerType
      );
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
      requestId: requestParams.requestId
    };
    const saveResponse: GenericResponse<T> = new GenericResponse<T>();
    saveResponse.errorRecords = validatedResources.errorResults;
    if (validatedResources.validResources.length > 0) {
      log.info("Calling prepareModelAndSave method ");
      const savedResources = await BasePost.prepareModelAndSave(validatedResources.validResources, payloadModel, payloadDataResourceModel, resourceMetaData);
      saveResponse.savedRecords = savedResources;
    }
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
  public static async prepareModelAndSave(requestPayload, model, modelDataResource, resourceMetaData: MetaDataElements) {
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
    return savedRecords;
  }
}
