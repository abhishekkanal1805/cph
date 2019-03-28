import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { DataSource } from "../../dataSource";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
import { DataService } from "../dao/dataService";

export class DataFetch {
  public static async fetchUserProfileInformationFromAuthorizer(authorizerData: any): Promise<any> {
    log.info("Entering UserService :: performUserAcessValidation()");
    const profileId: string = authorizerData.profile;
    const userAccessObj = {
      endpointPermission: false,
      loggedinId: profileId,
      profileStatus: "",
      profileType: "",
      displayName: ""
    };
    if (!profileId) {
      log.error("Error in UserService: User is not Authorized to perform requested operation");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    DataSource.addModel(UserProfile);
    const result = await DataService.fetchRowByPk(profileId, UserProfile);
    if (result.status !== "active") {
      log.error("Error in UserService: UserProfile status is inactive");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // if user is valid then set display attribute and profile status
    const givenName = result.name ? result.name.given || [] : [];
    const familyName = result.name ? result.name.family || "" : "";
    userAccessObj.profileStatus = result.status;
    userAccessObj.profileType = result.type;
    userAccessObj.displayName = [familyName, givenName.join(" ")].join(", ");
    log.info("performUserAcessValidation() success :: Exiting UserService: performUserAcessValidation()");
    return userAccessObj;
  }
}
