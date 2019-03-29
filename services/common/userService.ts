import * as log from "lambda-log";
import * as _ from "lodash";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, ForbiddenResult } from "../../common/objects/custom-errors";
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
    patientIds: string[],
    userIds: string[],
    httpMethod: string,
    patientValidationId: string,
    userValidationId: string,
    resource: any,
    authorizerData: any
  ): Promise<void> {
    log.info("Entering UserService :: performMultiUserValidation()");
    // Check user present in cognito or not and get profile Id
    let newRecords = [];
    for (const patientId of patientIds) {
      const callerUserProfileId = accessObj.loggedinId;
      const calleruserProfileType = accessObj.profileType;
      let userPermissions: string[] = [];
      let isPermissionValid: boolean = false;
      try {
        userPermissions = await UserAuthService.getUserPermissions(callerUserProfileId, patientId, calleruserProfileType, authorizerData, httpMethod);
        isPermissionValid = await UserAuthService.validatePermissions(userPermissions, httpMethod);
      } catch (err) {
        // if error occoured for a userId, then skip and go for next userId
        log.error("Error in UserService :: performMultiUserValidation() " + patientId);
      }
      const filteredRecords: any = _.filter(resource.savedRecords, (eachRecord) => {
        return Utility.getAttributeValue(eachRecord, patientValidationId) === ["UserProfile", patientId].join("/");
      });
      if (userPermissions.length && isPermissionValid) {
        newRecords = newRecords.concat(filteredRecords);
      } else {
        resource.errorRecords = resource.errorRecords.concat(
          _.map(filteredRecords, (d) => {
            const badRequest = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
            badRequest.clientRequestId = d.meta ? d.meta.clientRequestId : " ";
            return badRequest;
          })
        );
      }
    }
    if (userValidationId) {
      let validRecords = [];
      for (const userId of userIds) {
        let filteredRecords: any;
        if (newRecords.length > 0) {
          filteredRecords = _.filter(newRecords, (eachRecord) => {
            return Utility.getAttributeValue(eachRecord, userValidationId) === ["UserProfile", userId].join("/");
          });
          if (userId === accessObj.loggedinId) {
            validRecords = validRecords.concat(filteredRecords);
          } else {
            resource.errorRecords = resource.errorRecords.concat(
              _.map(filteredRecords, (d) => {
                const badRequest = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
                badRequest.clientRequestId = d.meta ? d.meta.clientRequestId : " ";
                return badRequest;
              })
            );
          }
          resource.savedRecords = validRecords;
        } else {
          resource.savedRecords = newRecords;
        }
      }
    } else {
      resource.savedRecords = newRecords;
    }
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
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }

  /**
   * Function to check if user has access to this endpoint or not
   * 1) make sure profileID is present in authorizer data. will be there only for logged in users
   * 2) Then is profileID Present in DB and in active state
   * 3) Then see if this user type [patient, practitioner etc] has access to the requested endpoint and request operation [GET, POST etc]
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
      // Add reference Type
      if (!ResponseBuilderService.typeMap[profileId]) {
        ResponseBuilderService.typeMap[profileId] = ["UserProfile", userAccessObj.profileType].join(".");
      }
      log.info("performUserAcessValidation() success :: Exiting UserService: performUserAcessValidation()");
      return userAccessObj;
    } catch (err) {
      log.error("Error in UserService :: performUserAcessValidation() " + err.stack);
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }

  /**
   * A function for doing basic user validation that can be used independent of DB operation.
   * If checks if the reference provided is a UserProfile reference.
   * If so, it will make sure the id is present in DB and also that it is an active user.
   * If not it will throw a BadRequestResult error with errorCode.InvalidId
   * The profile check is very basic. It will NOT check user permissions, user access, match with logged user etc.
   * Null or undefined references are not validated. So no errors will be thrown
   *
   * @param {string} profileReference, example UserProfile/<id>
   * @returns {Promise<void>} If user is valid ir returns nothing. If invalid it throws BadRequestResult.
   */
  public static async validateProfileReference(profileReference: string) {
    if (!profileReference) {
      return;
    }
    if (!profileReference.startsWith("UserProfile/")) {
      throw new BadRequestResult(errorCodeMap.InvalidRequest.value, errorCodeMap.InvalidRequest.description);
    }

    const userProfileId: string = profileReference.split("/")[1];
    DataSource.addModel(UserProfile);
    const savedProfile = await DataService.fetchDatabaseRowStandard(userProfileId, UserProfile);
    if (!savedProfile || savedProfile.status !== "active") {
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }
}

export { UserService };
