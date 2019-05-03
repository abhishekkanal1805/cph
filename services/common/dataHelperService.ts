/**
 * Author: Vivek Mishra, Ganesh , Vadim, Deba
 * Summary: This file contains all helper functions that are needed before making a call to database
 * E.g.: functions to update records or prepare search query
 */
import * as _ from "lodash";

class DataHelperService {
  /**
   * Converts raw record/payload into service model
   * if a serviceDataResource type was provided and if the dataResource field is also present then setting
   * @param record
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

export { DataHelperService };
