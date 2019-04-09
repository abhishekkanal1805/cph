export class DataTransform {
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
