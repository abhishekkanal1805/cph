/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { MetaDataElements, UpdateMetaDataElements } from "../../common/interfaces/baseInterfaces";
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
      isDeleted: false
    };
    if (resourceMetaData.requestLogRef) {
      metaDataObject.requestLogRef = resourceMetaData.requestLogRef;
    }
    if (record.meta) {
      metaDataObject.clientRequestId = record.meta.clientRequestId;
      metaDataObject.deviceId = record.meta.deviceId;
      metaDataObject.source = record.meta.source;
    }
    return metaDataObject;
  }

  public static getUpdateMetaData(record: any, resourceMetaData: UpdateMetaDataElements) {
    const timestamp = new Date().toISOString();
    const metaDataObject: any = {
      versionId: resourceMetaData.versionId + 1,
      created: resourceMetaData.created,
      lastUpdated: timestamp,
      createdBy: resourceMetaData.createdBy,
      lastUpdatedBy: resourceMetaData.lastUpdatedBy,
      isDeleted: resourceMetaData.isDeleted
    };
    if (resourceMetaData.requestLogRef) {
      metaDataObject.requestLogRef = resourceMetaData.requestLogRef;
    }
    metaDataObject.clientRequestId = record.meta.clientRequestId ? record.meta.clientRequestId : resourceMetaData.clientRequestId;
    metaDataObject.deviceId = record.meta.deviceId ? record.meta.deviceId : resourceMetaData.deviceId;
    metaDataObject.source = record.meta.source ? record.meta.source : resourceMetaData.source;
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
