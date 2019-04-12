import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";
import { DataHelperService } from "../common/dataHelperService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
import { DataTransform } from "../utilities/dataTransform";
import { JsonParser } from "../utilities/jsonParser";
import { RequestValidator } from "../validators/requestValidator";

export class BasePut {
  /**
   *  Wrapper function to perform update for CPH users
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requestorProfileId requestorProfileId Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BasePut
   */
  public static async updateRecord(requestPayload, patientElement: string, requestorProfileId: string, model, modelDataResource) {
    // We need modelDataResource to be passed for mapping request to dataresource columns.
    let total;
    if (!Array.isArray(requestPayload.entry)) {
      requestPayload = [requestPayload];
      total = 1;
    } else {
      total = requestPayload.total;
      requestPayload = requestPayload.entry.map((entry) => entry.resource);
      RequestValidator.validateBundleTotal(requestPayload, total);
      RequestValidator.validateBundlePostLimit(requestPayload, Constants.POST_LIMIT);
    }
    log.info("Record Array created succesfully in :: saveRecord()");
    const keysToFetch = new Map();
    keysToFetch.set("id", []);
    keysToFetch.set(Constants.DEVICE_REFERENCE_KEY, []);
    keysToFetch.set(patientElement, []);
    keysToFetch.set(Constants.INFORMATION_SOURCE_REFERENCE_KEY, []);
    const response = JsonParser.findValuesForKeyMap(requestPayload, keysToFetch);
    log.info("Reference Keys retrieved successfully :: saveRecord()");
    const uniqueDeviceIds = [...new Set(response.get(Constants.DEVICE_REFERENCE_KEY))].filter(Boolean);
    // patientvalidationid
    const patientIds: any = [...new Set(response.get(patientElement))];
    // userids
    const informationSourceIds = [...new Set(response.get(Constants.INFORMATION_SOURCE_REFERENCE_KEY))];
    // primary key Ids
    const primaryIds = [...new Set(response.get("id"))];
    // perform Authorization
    await RequestValidator.validateDeviceAndProfile(uniqueDeviceIds, informationSourceIds, patientIds);
    await RequestValidator.validateUniqueIDForPUT(primaryIds, total);
    // We can directly use 0th element as we have validated the uniqueness of reference key in validateDeviceAndProfile
    const patientId = patientIds[0].split("/")[1];
    const informationSourceId = informationSourceIds[0].split("/")[1];
    await AuthService.performAuthorization(requestorProfileId, informationSourceId, patientId);
    log.info("User Authorization successfully :: saveRecord()");
    const result = await BasePut.bulkUpdate(requestPayload, requestorProfileId, primaryIds, model, modelDataResource);
    log.info("Update successfull :: updateRecord()");
    return result;
  }

  /**
   *  Returns back array of saved or error out record after validating all records on basis of ID and version keys
   *  Also does the required update operation via Promise all after creating updateMetadata
   * @static
   * @param {*} requestPayload request payload
   * @param {string} requestorProfileId
   * @param {string[]} requestPrimaryIds
   * @param {*} model
   * @param {*} modelDataResource
   * @returns
   * @memberof BasePut
   */
  public static async bulkUpdate(requestPayload, requestorProfileId: string, requestPrimaryIds: string[], model, modelDataResource) {
    log.info("In bulkUpdate() :: DAO :: BasePut Class");
    const validPrimaryIds = await DataFetch.getValidIds(model, requestPrimaryIds);
    log.info("Valid primary Ids fetched successfully :: saveRecord()");
    const result: any = { savedRecords: [], errorRecords: [] };
    // creating an all promise array which can be executed in parallel.
    const allPromise = [];
    // looping over all records to filter good vs bad records
    requestPayload.forEach((record) => {
      // Finding if given record id exists in the record ID list received via DB batch get call.
      const existingRecord = validPrimaryIds.find((validPrimaryId) => {
        return validPrimaryId.id === record.id;
      });
      if (existingRecord) {
        // If record of given id exists in database then we come in this condition.
        if (existingRecord.meta.versionId === record.meta.versionId) {
          // We proceed with creation of metadata and adding record to be saved if its version ID is correct
          record.meta = DataTransform.getUpdateMetaData(record, existingRecord.meta, requestorProfileId, false);
          record = DataHelperService.convertToModel(record, model, modelDataResource).dataValues;
          const thisPromise = model
            .update(record, { where: { id: record.id } })
            .then(() => {
              result.savedRecords.push(record.dataResource);
            })
            .catch((err) => {
              log.error("Error in updating record: " + err);
              throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
            });
          allPromise.push(thisPromise);
        } else {
          // Else condition if version id is incorrect
          const badRequest = new BadRequestResult(errorCodeMap.InvalidResourceVersion.value, existingRecord.meta.versionId);
          badRequest.clientRequestId = record.meta.clientRequestId;
          result.errorRecords.push(badRequest);
        }
      } else {
        // Else condition if record sent to update doesnt exists in database
        const notFoundResult = new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
        notFoundResult.clientRequestId = record.meta.clientRequestId;
        result.errorRecords.push(notFoundResult);
      }
    });
    // promise all to run in parallel.
    log.info("Firing bulk update all promises :: bulkUpdate()");
    await Promise.all(allPromise);
    log.info("Bulk create successfull :: bulkUpdate()");
    return result;
  }
}
