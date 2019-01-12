import * as log from "lambda-log";
import * as _ from "lodash";
import { errorCode } from "../../common/constants/error-codes";
import * as config from "../../common/objects/config";
import { UnAuthorizedResult } from "../../common/objects/custom-errors";
import { DataSource } from "../../dataSource";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
import { DataService } from "../common/dataService";
import { UserAuthService } from "../security/userAuthService";
import { ResponseBuilderService } from "./responseBuilderService";
import { Utility } from "./Utility";

class UserService {
  /**
   * checking permissions for Practioner/Care partner type user
   * @param {*} accessObj User endpoint access object.
   * @param {string} userId Profile ID of request's reference object
   * @param {string} httpMethod operation that is being performed e.g. POST, GET etc.
   * @param {*} resource operation that is being performed e.g. POST, GET etc.
   *
   * @returns Returns a custom error in case user validation fails.
   */
  public static async performMultiUserValidation(
    accessObj: any,
    userIds: string[],
    httpMethod: string,
    userValidationId: string,
    resource: any,
    authorizerData: any
  ): Promise<void> {
    log.info("Entering UserService :: performMultiUserValidation()");
    // Check user present in cognito or not and get profile Id
    let newRecords = [];
    for (const userId of userIds) {
      const callerUserProfileId = accessObj.loggedinId;
      const calleruserProfileType = accessObj.profileType;
      let userPermissions: string[] = [];
      let isPermissionValid: boolean = false;
      try {
        userPermissions = await UserAuthService.getUserPermissions(callerUserProfileId, userId, calleruserProfileType, authorizerData, httpMethod);
        isPermissionValid = await UserAuthService.validatePermissions(userPermissions, httpMethod);
      } catch (err) {
        // if error occoured for a userId, then skip and go for next userId
        log.error("Error in UserService :: performMultiUserValidation() " + userId);
      }
      const filteredRecords: any = _.filter(resource.savedRecords, (eachRecord) => {
        return Utility.getAttributeValue(eachRecord, userValidationId) === ["UserProfile", userId].join("/");
      });
      if (userPermissions.length && isPermissionValid) {
        newRecords = newRecords.concat(filteredRecords);
      } else {
        resource.errorRecords = resource.errorRecords.concat(
          _.map(filteredRecords, (d) => {
            const badRequest = new UnAuthorizedResult(errorCode.InvalidUserId, "User don't have permission to update this record");
            badRequest.clientRequestId = d.meta ? d.meta.clientRequestId : " ";
            return badRequest;
          })
        );
      }
    }
    resource.savedRecords = newRecords;
  }

  /**
   * checking permissions for Practioner/Care partner type user
   * @param {*} accessObj User endpoint access object.
   * @param {string} userId Profile ID of request's reference object
   * @param {string} httpMethod operation that is being performed e.g. POST, GET etc.
   *
   * @returns Returns a custom error in case user validation fails.
   */
  public static async performUserValidation(accessObj: any, userId: string, authorizerData: any, httpMethod: string): Promise<void> {
    log.info("Entering UserService :: performUserValidation()");
    // Check user present in cognito or not and get profile Id
    try {
      const callerUserProfileId = accessObj.loggedinId;
      const calleruserProfileType = accessObj.profileType;
      const userPermissions: string[] = await UserAuthService.getUserPermissions(
        callerUserProfileId,
        userId,
        calleruserProfileType,
        authorizerData,
        httpMethod
      );
      // Validate permission for that user
      const isUserOperationAllowed: boolean = await UserAuthService.validatePermissions(userPermissions, httpMethod);
      if (!isUserOperationAllowed) {
        throw new Error("User is not Authorized to perform requested operation");
      }
      log.info("performUserValidation() success :: Exiting UserService: performUserValidation()");
    } catch (err) {
      log.error("Error in UserService :: performUserValidation() " + err.stack);
      throw new UnAuthorizedResult(errorCode.UnauthorizedUser, "User Validation Failed");
    }
  }

  /**
   * Function to check if user has access to this endpoint or not
   *
   * @param {*} serviceModel Sequelize model class of the target table
   * @param {*} authorizerData AWS cognito authorizer data from incoming request.
   * @param {string} httpMethod operation that is being performed e.g. POST, GET etc.
   *
   * @returns Returns a custom error if user don't have access.
   */
  public static async performUserAccessValidation(serviceModel: any, authorizerData: any, httpMethod: string) {
    log.info("Entering UserService :: performUserAcessValidation()");
    const profileId: string = authorizerData.profile || "";
    const userAccessObj: any = {
      endpointPermission: false,
      loggedinId: profileId,
      profileStatus: "",
      profileType: "",
      displayName: ""
    };
    try {
      const endpointName: string = serviceModel.name.toLowerCase();
      // for serverless-offline & UserProfile we don't have to check permission
      if (endpointName === "userprofile") {
        userAccessObj.endpointPermission = true;
        return userAccessObj;
      }
      // if profile id missing in cognito profile then throw error
      if (!profileId) {
        log.error("Error in UserService: User is not Authorized to perform requested operation");
        throw new Error("User is not Authorized to perform requested operation");
      }
      // check if record exists in userProfile table for the profileId
      // UserProfile model added to sequlize to perfrom db operation
      DataSource.addModel(UserProfile);
      const result = await DataService.fetchDatabaseRowStandard(profileId, UserProfile);
      if (result.status !== "active") {
        log.error("Error in UserService: UserProfile status is inactive");
        throw new Error("UserProfile status is inactive");
      }
      // check if profile type has access to endpoint or not
      if (!config.settings[endpointName] || !config.settings[endpointName]["endpointAccess"]) {
        log.error("Error in UserService: profileType/endpointName doesn't exists in congfig section");
        throw new Error("profileType/endpointName doesn't exists in congfig section");
      }
      const allowedMethodTypes: string[] = config.settings[endpointName]["endpointAccess"][result.type];
      if (allowedMethodTypes.length < 1) {
        log.error("Error in UserService: endpointName doesn't exists in congfig section");
        throw new Error("endpointName doesn't exists in congfig section");
      }
      // if * then user has access to all methods else selected methods
      if (allowedMethodTypes[0] === "*" || allowedMethodTypes.indexOf(httpMethod) > -1) {
        userAccessObj.endpointPermission = true;
      }
      // if user is valid then set display attribute and profile status
      const givenName = result.name ? result.name.given || [] : [];
      const familyName = result.name ? result.name.family || "" : "";
      userAccessObj.profileStatus = result.status;
      userAccessObj.profileType = result.type;
      userAccessObj.displayName = [familyName, givenName.join(" ")].join(", ");
      log.info("Display Name: " + userAccessObj.displayName);
      if (!ResponseBuilderService.displayMap[profileId]) {
        const displayName = userAccessObj.displayName ? userAccessObj.displayName || [] : [];
        ResponseBuilderService.displayMap[profileId] = displayName ? displayName : " ";
      }
      log.info("performUserAcessValidation() success :: Exiting UserService: performUserAcessValidation()");
      return userAccessObj;
    } catch (err) {
      log.error("Error in UserService :: performUserAcessValidation() " + err.stack);
      throw new UnAuthorizedResult(errorCode.UnauthorizedUser, "User don't have permission to access this endpoint");
    }
  }
}

export { UserService };
