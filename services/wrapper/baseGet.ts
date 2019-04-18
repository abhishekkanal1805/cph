import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
import { JsonParser } from "../utilities/jsonParser";

export class BaseGet {
  /**
   *
   *
   * @static
   * @param {string} id
   * @param {*} model
   * @param {string} requestorProfileId
   * @param {*} userElement
   * @param {*} patientElement
   * @returns
   * @memberof BaseGet
   */
  public static async getResource(id: string, model, requestorProfileId: string, patientElement) {
    log.info("In BaseGet :: getResource()");
    const options = { "meta.isDeleted": false };
    let record = await DAOService.fetchRowByPkQuery(id, model, options);
    record = record.dataResource;
    const patientIds = JsonParser.findValuesForKey([record], patientElement, false);
    const patientId = patientIds[0];
    log.info("getResource() :: Authorization started");
    const requestorUserProfile = await DataFetch.getUserProfile(requestorProfileId);
    requestorUserProfile.profileId = Constants.USERPROFILE_REFERENCE + requestorUserProfile.profileId;
    log.info("UserProfile information retrieved successfully :: saveRecord()");
    await AuthService.hasConnectionBasedAccess(requestorUserProfile.profileId, requestorUserProfile.profileType, patientId);
    log.info("getResource() :: Record retrieved successfully");
    return record;
  }

  /**
   *
   *
   * @static
   * @param {string} id
   * @param {*} model
   * @param {string} requestorProfileId
   * @param {*} userElement
   * @param {*} patientElement
   * @returns
   * @memberof BaseGet
   */
  public static async getUserProfileResource(id: string, requestorProfileId: string) {
    log.info("In BaseGet :: getUserProfileResource()");
    const options = { "meta.isDeleted": false };
    let record = await DAOService.fetchRowByPkQuery(id, UserProfile, options);
    record = record.dataResource;
    log.info("getUserProfileResource() :: Authorization started");
    const requestorUserProfile = await DataFetch.getUserProfile(requestorProfileId);
    requestorUserProfile.profileId = Constants.USERPROFILE_REFERENCE + requestorUserProfile.profileId;
    const patientId = Constants.USERPROFILE_REFERENCE + id;
    log.info("UserProfile information retrieved successfully :: saveRecord()");
    await AuthService.hasConnectionBasedAccess(requestorUserProfile.profileId, requestorUserProfile.profileType, patientId);
    log.info("getResource() :: Record retrieved successfully");
    return record;
  }
}
