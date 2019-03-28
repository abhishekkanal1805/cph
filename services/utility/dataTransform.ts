import * as log from "lambda-log";

export class DataTransform {
  public static extractRecordsFromRequest(request: any): any[] {
    if (!Array.isArray(request.entry)) {
      request = [request];
    } else {
      request = request.entry.map((entry) => entry.resource);
    }
    return request;
  }

  public static getRecordMetaData(record, createdByUser: string, modifiedByUser: string) {
    log.info("Entering Utility: getRecordMeta()");
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
    log.info("Exiting Utility: getRecordMeta()");
    return metaDataObject;
  }
}
