import * as log from "lambda-log";

export class DataTransform {
  /**
   * Receives createdByUser, modifiedByUser and clientRequestId, generates metadata information for that record
   * @param {string}
   * @param {string}
   * @param {string}
   * @example
   * const createdByUser = '45de787a-cf38-4ecd-9541-d7ba641ecb4e'
   * const modifiedByUser = '45de787a-cf38-4ecd-9541-d7ba641ecb4e'
   * const clientRequestId = ''
   * getMetadata(createdByUser, modifiedByUser, clientRequestId)
   * @returns {Object}
   */
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
