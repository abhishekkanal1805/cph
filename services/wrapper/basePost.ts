import * as log from "lambda-log";
import * as uuid from "uuid";
import { Constants } from "../../common/constants/constants";
import { DataHelperService } from "../common/dataHelperService";
import { GenericResponse } from "../common/genericResponse";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { DataTransform } from "../utilities/dataTransform";
import { JsonParser } from "../utilities/jsonParser";
import { ReferenceValidator } from "../validators/referenceValidator";
import { RequestValidator } from "../validators/requestValidator";

export class BasePost {

  public static async saveClinicalResources<T>(requestPayload,
                                               requestorProfileId: string,
                                               payloadModel: T,
                                               payloadDataResourceModel,
                                               patientElement: string,
                                               informationSourceElement: string,
                                               referenceValidationModel?,
                                               referenceValidationElement?: string): Promise<GenericResponse<T>> {

    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    log.info("Record Array created succesfully in :: saveResource()");
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientElement, []);
    keysToFetch.set(informationSourceElement, []);
    const valuesMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveResource()");
    const uniqueDeviceIds = [...new Set(valuesMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    // patientvalidationid
    const patientIds = [...new Set(valuesMap.get(patientElement))];
    const informationSourceIds = [...new Set(valuesMap.get(informationSourceElement))];

    // perform Authorization
    await RequestValidator.validateDeviceAndProfile(uniqueDeviceIds, informationSourceIds, patientIds);
    // We can directly use 0th element as we have validated the uniqueness of reference key in validateDeviceAndProfile
    const patientReferenceValue = patientIds[0];
    const informationSourceReferenceValue = informationSourceIds[0];
    // TODO: any scenarios when we want to skip this?
    await AuthService.authorizeRequest(requestorProfileId, informationSourceReferenceValue, patientReferenceValue);
    log.info("User Authorization is successful ");

    const validatedResources = await ReferenceValidator.validateReference(requestPayload, referenceValidationModel, referenceValidationElement);

    const saveResponse: GenericResponse<T> = new GenericResponse<T>();
    saveResponse.errorRecords = validatedResources.errorResults;
    if (validatedResources.validResources.length > 0) {
      log.info("Calling prepareModelAndSave method ");
      const savedResources = await BasePost.prepareModelAndSave(
        validatedResources.validResources,
        payloadModel,
        payloadDataResourceModel,
        requestorProfileId,
        requestorProfileId
      );
      saveResponse.savedRecords = savedResources;
    }
    return saveResponse;
  }

  public static async saveNonClinicalResources<T>(requestPayload,
                                                  requestorProfileId: string,
                                                  payloadModel: T,
                                                  payloadDataResourceModel,
                                                  ownerElement: string,
                                                  referenceValidationModel?,
                                                  referenceValidationElement?: string): Promise<GenericResponse<T>> {

    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    log.info("Record Array created succesfully in :: saveResource()");
    const keysToFetch = new Map();
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(ownerElement, []);

    const valuesMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveResource()");
    const uniqueDeviceIds = [...new Set(valuesMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    const ownerIds = [...new Set(valuesMap.get(ownerElement))];

    //  perform deviceId validation
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.info("User Authorization is successful ");
    // perform owner reference validation
    RequestValidator.validateSingularPatientReference(ownerIds);
    log.info("User Authorization is successful ");

    // perform Authorization
    await AuthService.authorizeRequest(requestorProfileId, ownerIds[0], ownerIds[0]);
    log.info("User Authorization is successful ");

    const validatedResources = await ReferenceValidator.validateReference(requestPayload, referenceValidationModel, referenceValidationElement);

    const saveResponse: GenericResponse<T> = new GenericResponse<T>();
    saveResponse.errorRecords = validatedResources.errorResults;
    if (validatedResources.validResources.length > 0) {
      log.info("Calling prepareModelAndSave method ");
      const savedResources = await BasePost.prepareModelAndSave(
        validatedResources.validResources,
        payloadModel,
        payloadDataResourceModel,
        requestorProfileId,
        requestorProfileId
      );
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
   * @param {*} createdBy Id of logged in user
   * @param {*} updatedBy Id of logged in user
   * @return {Promise<any>}
   */
  public static async prepareModelAndSave(requestPayload, model, modelDataResource, createdBy: string, updatedBy: string) {
    requestPayload.forEach((record, index) => {
      record.meta = DataTransform.getRecordMetaData(record, createdBy, updatedBy);
      record.id = uuid();
      record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
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
