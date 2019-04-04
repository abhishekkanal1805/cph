import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
import { DataService } from "../dao/dataService";

export class DataFetch {
  /**
   * Retrieves UserProfile information by reading profile ID from authorizer data coming from request.
   *
   * @static
   * @param {*} authorizerData
   * @returns {Promise<any>}
   * @memberof DataFetch
   */
  public static async fetchUserProfileInformationFromAuthorizer(authorizerData: any): Promise<any> {
    log.info("Entering DataFetch :: fetchUserProfileInformationFromAuthorizer()");
    const profileId: string = authorizerData.profile;
    const userAccessObj = {
      endpointPermission: false,
      loggedinId: profileId,
      profileStatus: "",
      profileType: "",
      displayName: ""
    };
    if (!profileId) {
      log.error("Error in DataFetch: ProfileId is missing in authorizer");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    const result = await DataService.fetchRowByPk(profileId, UserProfile);
    if (result.status !== "active") {
      log.error("Error in DataFetch: UserProfile status is inactive");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // if user is valid then set display attribute and profile status
    const givenName = result.name ? result.name.given || [] : [];
    const familyName = result.name ? result.name.family || "" : "";
    userAccessObj.profileStatus = result.status;
    userAccessObj.profileType = result.type;
    userAccessObj.displayName = [familyName, givenName.join(Constants.SPACE_VALUE)].join(Constants.COMMA_SPACE_VALUE);
    return userAccessObj;
  }
}
