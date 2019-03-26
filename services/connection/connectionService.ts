import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import * as config from "../../common/objects/config";
import { ForbiddenResult, NotFoundResult, BadRequestResult } from "../../common/objects/custom-errors";
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
    let mandatoryAttribute;
    if (["practitioner", "carepartner", "patient"].indexOf(userProfile.type.toLowerCase()) === -1) {
      log.error("Error occoured due to invalid userType: " + userProfile.type);
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // Condition added for Patient. Patient must give his id in from
    // using this attibute to validate whether its a userProfile or not
    if (userProfile.type === "patient") {
      // Validate from and loggedinId both are same for patient
      if (queryParams.hasOwnProperty("from") && queryParams["from"] != loggedinId) {
        log.error("Error occoured due to patient type");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      } else if (queryParams.hasOwnProperty("to")) {
        if (queryParams["to"] != loggedinId) {
          queryParams["from"] = loggedinId;
          mandatoryAttribute = "from";
        } else {
          mandatoryAttribute = "to";
        }
      } else if (!queryParams.hasOwnProperty("to") && !queryParams.hasOwnProperty("from")) {
        queryParams["from"] = loggedinId;
        mandatoryAttribute = "from";
      } else {
        mandatoryAttribute = "from";
      }
    } else if (["practitioner", "carepartner"].indexOf(userProfile.type) > -1) {
      // Validate to and loggedinId both are same for partner and delegate
      if (queryParams.hasOwnProperty("to") && queryParams["to"] != loggedinId) {
        log.error("Error occoured due to practitioner/carepartner type");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      } else if (queryParams.hasOwnProperty("from")) {
        if (queryParams["from"] != loggedinId) {
          queryParams["to"] = loggedinId;
          mandatoryAttribute = "to";
        } else {
          mandatoryAttribute = "from";
        }
      } else if (!queryParams.hasOwnProperty("to") && !queryParams.hasOwnProperty("from")) {
        queryParams["from"] = loggedinId;
        mandatoryAttribute = "from";
      } else {
        mandatoryAttribute = "to";
      }
    } else {
      log.error("Error occoured due to invalid type");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    log.info("queryParams", queryParams);
    if (queryParams.hasOwnProperty("to")) {
      queryParams["to"] = [queryParams["to"].includes("UserProfile") ? queryParams["to"] : ["UserProfile", queryParams["to"]].join("/")];
    }
    if (queryParams.hasOwnProperty("from")) {
      queryParams["from"] = [queryParams["from"].includes("UserProfile") ? queryParams["from"] : ["UserProfile", queryParams["from"]].join("/")];
    }
    const searchAttributes = config.settings.connection.searchAttributes;
    const endPoint = "connection";
    const performUserValidation = false;
    const appendUserProfile = false;
    const attributes = ["id", "resourceType", "from", "type", "status", "requestExpirationDate", "to", "lastStatusChangeDateTime", "meta", "dataResource"];
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
    for (const record of searchResult) {
      await this.getUpdatedResponse(record);
    }
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
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
    if (userProfileObj.status != "active") {
      throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    }
    if (uniqueCode && userProfileObj.userCode != uniqueCode) {
      throw new BadRequestResult(errorCodeMap.InvalidRequest.value, errorCodeMap.InvalidRequest.description);
    }
    const referenceId = userProfileObj.id;
    if (!profileDisplay.hasOwnProperty(referenceId)) {
      const givenName = userProfileObj.name.given || [];
      profileDisplay[referenceId] = userProfileObj.name ? givenName.join(" ") : "";
    }
    return userProfileObj;
  }

  /**
   * To update display attributes in response object
   * @param {any} responseObj response object
   * @returns {Promise<any>}
   */
  public static async getUpdatedResponse(responseObj: any): Promise<any> {
    const referenceValFrom = responseObj.from.reference.split("/").reverse()[0];
    const referenceValTo = responseObj.to.reference.split("/").reverse()[0];
    if (!profileDisplay.hasOwnProperty(referenceValFrom) && !profileDisplay.hasOwnProperty(referenceValTo)) {
      await Promise.all([await this.isProfileValid(referenceValFrom, null, null), await this.isProfileValid(referenceValTo, null, null)]);
    } else if (profileDisplay.hasOwnProperty(referenceValFrom) && !profileDisplay.hasOwnProperty(referenceValTo)) {
      await this.isProfileValid(referenceValTo, null, null);
    } else if (!profileDisplay.hasOwnProperty(referenceValFrom) && profileDisplay.hasOwnProperty(referenceValTo)) {
      await this.isProfileValid(referenceValFrom, null, null);
    }
    responseObj.from.display = profileDisplay.hasOwnProperty(referenceValFrom) ? profileDisplay[referenceValFrom] : "";
    responseObj.to.display = profileDisplay.hasOwnProperty(referenceValTo) ? profileDisplay[referenceValTo] : "";
    return responseObj;
  }
}
