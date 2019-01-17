import * as log from "lambda-log";
import { errorCode } from "../../common/constants/error-codes";
import * as config from "../../common/objects/config";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
import { DataService } from "../common/dataService";

const profileDisplay: any = {};

export class ConnectionService {
  /**
   * To search connection record for the provided query string
   * @param {any} serviceModel Sequelize model class of the target table.
   * @param {any} queryParams query string
   * @param {any} loggedinId logged in user's user id
   * @param {any} authorizerData context data
   * @param {string} httpMethod http method
   * @returns {Promise<any>}
   */
  public static async searchConnection(serviceModel: any, queryParams: any, loggedinId: any, authorizerData: any, httpMethod: string): Promise<any> {
    const userProfile: any = await this.isProfileValid(loggedinId, authorizerData, httpMethod);
    if (["practitioner", "careteam", "patient"].indexOf(userProfile.type.toLowerCase()) === -1) {
      log.error("Error occoured due to invalid userType: " + userProfile.type);
      throw new BadRequestResult(errorCode.InvalidRequest, "User is not authorized to perform this operation");
    }
    // Condition added for Patient. Patient must give his id in from
    // using this attibute to validate whether its a userProfile or not
    if (userProfile.type === "patient") {
      // Validate from and loggedinId both are same for patient
      if (queryParams.hasOwnProperty("from") && queryParams["from"] != loggedinId) {
        log.error("Error occoured due to patient type");
        throw new BadRequestResult(errorCode.InvalidRequest, "User is not authorized to perform this operation");
      }
      queryParams["from"] = [loggedinId];
      queryParams["to"] = [queryParams["to"]];
    } else if (["practitioner", "careteam"].indexOf(userProfile.type) > -1) {
      // Validate to and loggedinId both are same for partner and delegate
      if (queryParams.hasOwnProperty("to") && queryParams["to"] != loggedinId) {
        log.error("Error occoured due to practitioner/careteam type");
        throw new BadRequestResult(errorCode.InvalidRequest, "User is not authorized to perform this operation");
      }
      queryParams["to"] = [loggedinId];
      queryParams["from"] = [queryParams["from"]];
    } else {
      log.error("Error occoured due to invalid type");
      throw new BadRequestResult(errorCode.InvalidRequest, "User is not authorized to perform this operation");
    }
    log.info("queryParams", queryParams);
    const searchAttributes = config.settings.connection.searchAttributes;
    const endPoint = "connection";
    const mandatoryAttribute = "from";
    const performUserValidation = false;
    const appendUserProfile = true;
    const attributes = ["id", "resourceType", "from", "type", "status", "requestExpirationDate", "to", "lastStatusChangeDateTime", "meta"];
    const searchResult = await DataService.searchRecords(
      serviceModel,
      authorizerData,
      httpMethod,
      searchAttributes,
      queryParams,
      mandatoryAttribute,
      endPoint,
      attributes,
      performUserValidation,
      appendUserProfile
    );
    return searchResult;
  }

  /**
   * To check whether the provide user profile valid or not
   * @param {string} profileId user profile id
   * @param {any} authorizerData context data
   * @param {string} httpMethod http method
   * @returns {Promise<any>}
   */
  public static async isProfileValid(profileId: string, authorizerData: any, httpMethod: string, uniqueCode?: string): Promise<any> {
    log.info("profileId", profileId);
    const performUserValidation = false;
    const fetchDeletedRecord = false;
    const userValidationId = "id";
    const userProfileObj: any = await DataService.getRecord(
      UserProfile,
      authorizerData,
      httpMethod,
      profileId,
      performUserValidation,
      userValidationId,
      fetchDeletedRecord
    );
    if (!userProfileObj.id) {
      throw new BadRequestResult(errorCode.ResourceNotSaved, "UserProfile doesn't exists");
    }
    if (userProfileObj.status != "active") {
      throw new BadRequestResult(errorCode.ResourceNotSaved, "UserProfile is not active");
    }
    if (uniqueCode && userProfileObj.userCode != uniqueCode) {
      throw new BadRequestResult(errorCode.InvalidRequest, "Provided userCode is invalid");
    }
    const referenceId = userProfileObj.id;
    if (!profileDisplay.hasOwnProperty(referenceId)) {
      const givenName = userProfileObj.name.given || [];
      profileDisplay[referenceId] = userProfileObj.name ? givenName.join(" ") : "";
    }
    return userProfileObj;
  }
}
