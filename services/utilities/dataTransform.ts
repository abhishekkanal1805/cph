import { MetaDataElements } from "../../common/interfaces/baseInterfaces";
export class DataTransform {
  /**
   * Generates record's metadata as per information passed to it.
   * TODO: this function is only used in the context of creating record as version 1 is assigned. it would help to rename this as such.
   * @static
   * @param {*} record
   * @param {MetaDataElements} resourceMetaData
   * @returns
   * @memberof DataTransform
   */
  public static getRecordMetaData(record, resourceMetaData: MetaDataElements) {
    const timestamp = new Date().toISOString();
    const metaDataObject: any = {
      versionId: 1,
      created: timestamp,
      lastUpdated: timestamp,
      createdBy: resourceMetaData.createdBy,
      lastUpdatedBy: resourceMetaData.lastUpdatedBy,
      isDeleted: false,
      requestId: resourceMetaData.requestId
    };
    if (record.meta) {
      metaDataObject.clientRequestId = record.meta.clientRequestId;
      metaDataObject.deviceId = record.meta.deviceId;
      metaDataObject.source = record.meta.source;
    }
    return metaDataObject;
  }

  // TODO: we dont need the entire record, only the updatedRecord.meta will do.
  public static getUpdateMetaData(updateRecord, existingRecordMetadata, modifiedByUser: string, isDeleted: boolean) {
    const timestamp = new Date().toISOString();
    const metaDataObject: any = {
      versionId: existingRecordMetadata.versionId + 1,
      created: existingRecordMetadata.created,
      lastUpdated: timestamp,
      createdBy: existingRecordMetadata.createdBy,
      lastUpdatedBy: modifiedByUser,
      isDeleted
    };

    metaDataObject.clientRequestId = updateRecord.meta.clientRequestId ? updateRecord.meta.clientRequestId : existingRecordMetadata.clientRequestId;
    metaDataObject.deviceId = updateRecord.meta.deviceId ? updateRecord.meta.deviceId : existingRecordMetadata.deviceId;
    metaDataObject.source = updateRecord.meta.source ? updateRecord.meta.source : existingRecordMetadata.source;

    return metaDataObject;
  }

  /**
   * Converts raw record/payload into service model
   * if a serviceDataResource type was provided and if the dataResource field is also present then setting
   * TODO: Use generics to enforce the type for serviceModel and serviceDataResource.
   * @param record Caller is expected to provide record as object not JSON.
   * @param serviceModel
   * @param serviceDataResource
   * @returns {any}
   */
  public static convertToModel(record: any, serviceModel: any, serviceDataResource: any) {
    const recordAsModel = Object.assign(new serviceModel(), record); // this makes sure all fields other than dataResource are copied
    recordAsModel.dataResource = Object.assign(new serviceDataResource(), record);
    return recordAsModel;
  }
}
