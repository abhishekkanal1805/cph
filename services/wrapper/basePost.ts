import * as log from "lambda-log";
import * as uuid from "uuid";
import { Constants } from "../../common/constants/constants";
import { GenericResponse } from "../common/genericResponse";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
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
   * @param requestPayload
   * @param {string} requestorProfileId
   * @param {T} payloadModel
   * @param payloadDataResourceModel
   * @param {string} patientElement
   * @param {string} informationSourceElement
   * @param referenceValidationModel
   * @param {string} referenceValidationElement
   * @returns {Promise<GenericResponse<T>>}
   */
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
    // validate information source key only if element is present and if its different from patient element
    const validateInformationSourceElement: boolean = informationSourceElement && (informationSourceElement !== patientElement);
    if (validateInformationSourceElement) {
      keysToFetch.set(informationSourceElement, []);
    }
    const keysMap = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Device and User Keys retrieved successfully :: saveResource()");

    // perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    log.debug("Devices [" + patientElement + "] validation is successful");

    // perform user validation for owner reference
    const patientReferences = [...new Set(keysMap.get(patientElement))];
    RequestValidator.validateSingularUserReference(patientReferences);
    const patientReferenceValue = patientReferences[0];
    log.debug("PatientElement [" + patientElement + "] validation is successful");

    // perform user validation for information source
    let informationSourceReferenceValue = patientReferenceValue; // handling for FHIR services
    if (validateInformationSourceElement) {
      const informationSourceIds = [...new Set(keysMap.get(informationSourceElement))];
      RequestValidator.validateSingularUserReference(informationSourceIds);
      informationSourceReferenceValue = informationSourceIds[0];
      log.debug("InformationSourceElement [" + informationSourceElement + "] validation is successful");
    }
    log.info("Device and user validation is successful");

    await AuthService.authorizeRequest(requestorProfileId, informationSourceReferenceValue, patientReferenceValue, Constants.PATIENT_USER);
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
   * FIXME: Review this for non-clinical usage. Currently no integrations
   * @param requestPayload
   * @param {string} requestorProfileId
   * @param {T} payloadModel
   * @param payloadDataResourceModel
   * @param {string} ownerElement
   * @param referenceValidationModel
   * @param {string} referenceValidationElement
   * @returns {Promise<GenericResponse<T>>}
   */
  public static async saveNonClinicalResources<T>(requestPayload,
                                                  requestorProfileId: string,
                                                  payloadModel: T,
                                                  payloadDataResourceModel,
                                                  ownerElement: string,
                                                  informationSourceElement: string,
                                                  referenceValidationModel?,
                                                  referenceValidationElement?: string): Promise<GenericResponse<T>> {

    log.info("saveNonClinicalResources() started");
    requestPayload = RequestValidator.processAndValidateRequestPayload(requestPayload);
    log.info("Record Array created succesfully in :: saveResource()");

    const keysMap = JsonParser.findAllKeysAsMap(
      requestPayload,
      Constants.DEVICE_REFERENCE_KEY,
      ownerElement, informationSourceElement);
    log.info("Reference Keys retrieved successfully :: saveResource()");

    //  perform deviceId validation
    const uniqueDeviceIds = [...new Set(keysMap.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    await RequestValidator.validateDeviceIds(uniqueDeviceIds);
    // perform owner reference validation
    const ownerReferences = [...new Set(keysMap.get(ownerElement))];
    RequestValidator.validateSingularUserReference(ownerReferences);
    // perform infoSource reference validation
    const informationSourceReferences = [...new Set(keysMap.get(informationSourceElement))];
    RequestValidator.validateSingularUserReference(informationSourceReferences);

    // perform Authorization, not setting ownerType as we do not care if patient or any other.
    await AuthService.authorizeRequest(requestorProfileId, informationSourceReferences[0], ownerReferences[0]);
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
    log.info("saveNonClinicalResources() completed");
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
