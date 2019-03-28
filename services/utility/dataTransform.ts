import * as log from "lambda-log";

export class DataTransform {
  /**
   * Transforms incoming request to generate an array in case of non bundle.
   * In case of bundle request, generates a new array with bundle's resource section.
   * @static
   * @param {*} request
   * @returns {any[]}
   * @memberof DataTransform
   */
  public static extractRecordsFromRequest(request: any): any[] {
    log.info("Entering DataTransform: extractRecordsFromRequest()");
    if (!Array.isArray(request.entry)) {
      request = [request];
    } else {
      request = request.entry.map((entry) => entry.resource);
    }
    return request;
  }

  /**
   * Generates record's metadata as per information passed to it.
   *
   * @static
   * @param {*} record
   * @param {string} createdByUser
   * @param {string} modifiedByUser
   * @returns
   * @memberof DataTransform
   */
  public static getRecordMetaData(record, createdByUser: string, modifiedByUser: string) {
    const timestamp = new Date().toISOString();
    const metaDataObject: any = {
      versionId: 1,
      created: timestamp,
      lastUpdated: timestamp,
      createdBy: createdByUser,
      lastUpdatedBy: modifiedByUser,
      isDeleted: false
    };
    if (record.meta) {
      metaDataObject.clientRequestId = record.meta.clientRequestId;
      metaDataObject.deviceId = record.meta.deviceId;
      metaDataObject.source = record.meta.source;
    }
    return metaDataObject;
  }
}
