import * as AWS from "aws-sdk";
import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { Connection } from "../../models/CPH/connection/connection";
import { ConenctionService } from "../connection/connectionService";

export class UserAuthService {
  /**
   * Validate permission set against requested permission
   * @param permissions Allowed set of permissions for that user
   * @param methodType operation that user is trying to perform
   */
  public static validatePermissions(permissions: any[], methodType: string): boolean {
    log.info("Entering userAuthService :: validatePermissions()");
    log.debug("Requested method ::", methodType, "Permissions allowed :: ", permissions);
    const methodMap: any = {
      POST: "WRITE",
      PUT: "WRITE",
      GET: "READ",
      DELETE: "WRITE"
    };
    if (methodMap.hasOwnProperty(methodType.toUpperCase())) {
      if (permissions.indexOf(methodMap[methodType]) > -1) {
        return true;
      }
    }
    log.info("Exiting userAuthService :: validatePermissions()");
    return false;
  }

  public static async getPermissions(
    callerUserProfileId: string,
    calledUserProfileId: string,
    calleruserProfileType: string,
    contextData: string,
    methodType: string
  ) {
    let permissionObj: any = {
      status: false,
      permissions: []
    };
    if (callerUserProfileId == calledUserProfileId) {
      permissionObj = {
        status: true,
        permissions: ["READ", "WRITE"]
      };
      return permissionObj;
    }
    if (!callerUserProfileId || !calleruserProfileType || !calledUserProfileId) {
      return permissionObj;
    }
    calleruserProfileType = calleruserProfileType.toLowerCase();
    // Accepted calleruserProfileType ["Patient", "Partner", "Friend", "Deligate", "Practitioner", "CarePatner"]
    if (calleruserProfileType === "friend") {
      log.info("Validation success");
      permissionObj = {
        status: true,
        permissions: []
      };
      return permissionObj;
    }
    if (calleruserProfileType === "patient") {
      log.info("Validation success");
      if (callerUserProfileId !== calledUserProfileId) {
        return permissionObj;
      }
      permissionObj = {
        status: true,
        permissions: ["READ", "WRITE"]
      };
      return permissionObj;
    }
    // https://jira.tools.deloitteinnovation.us/browse/CHCONHUB-434, type should be partner
    if (["practitioner", "partner", "deligate", "carepatner"].indexOf(calleruserProfileType) > -1) {
      const query: any = {
        to: callerUserProfileId,
        from: calledUserProfileId,
        status: "active"
      };
      const result: any = await ConenctionService.searchConnection(
        Connection,
        query,
        callerUserProfileId,
        contextData,
        methodType
      );
      log.info("result: ", result);
      if (result.length) {
        log.info("Validation success");
        permissionObj = {
          status: true,
          permissions: ["READ"]
        };
      } else {
        log.error("Validation failed for: Don't have permission to perform this operation");
      }
      return permissionObj;
    }
    // If invalid for all cases return No permission
    return permissionObj;
  }

  /**
   * Checks permissions related to user.
   * @param callerUserProfileId refers to caller user id present in incoming request e.g. subject.refernce
   * @param calledUserProfileId refers to user profile id present in cognito
   * @param calleruserProfileType refer to type of user profile based on user profile table.
   *
   * @returns Returns a permissionObj with status as true if user has permission to access data.
   */
  public static async getUserPermissions(
    callerUserProfileId: string,
    calledUserProfileId: string,
    calleruserProfileType: string,
    authorizerData: any,
    httpMethod: string
  ): Promise<string[]> {
    log.info("Entering UserAuthService :: getPermissions()");
    let permissions = [];
    log.debug(
      "callerUserProfileId ::",
      callerUserProfileId,
      "calledUserProfileId ::",
      calledUserProfileId,
      "calleruserProfileType ::",
      calleruserProfileType
    );
    if (!(callerUserProfileId && calleruserProfileType && calledUserProfileId)) {
      throw new Error("Either callerUserProfileId/calleruserProfileType/calledUserProfileId is null or undefined");
    }
    if (callerUserProfileId == calledUserProfileId) {
      permissions = ["READ", "WRITE"];
      log.info("Read Write permission :: Exiting UserAuthService :: getPermissions()");
      return permissions;
    }
    calleruserProfileType = calleruserProfileType.toLowerCase();
    // Accepted calleruserProfileType ["Patient", "Partner", "Friend", "Deligate", "Practitioner", "CarePatner"]
    if (calleruserProfileType === "friend") {
      log.debug("Friend profile :: Exiting UserAuthService :: getPermissions()");
      return permissions;
    }
    if (calleruserProfileType === "patient") {
      if (callerUserProfileId !== calledUserProfileId) {
        log.error("callerUserProfileId and calledUserProfileId are different");
        throw new Error("callerUserProfileId and calledUserProfileId are different");
      }
      log.info("patient profile :: Exiting UserAuthService :: getPermissions()");
      return permissions;
    }
    if (["practitioner", "partner", "deligate", "carepatner"].indexOf(calleruserProfileType) > -1) {
      const query: any = {
        to: callerUserProfileId,
        from: calledUserProfileId,
        status: "active"
      };
      const result: any = await ConenctionService.searchConnection(
        Connection,
        query,
        callerUserProfileId,
        authorizerData,
        httpMethod
      );
      if (result.length) {
        log.info("searchConnection() success in BaseService :: getPermissions()");
        permissions = ["READ"];
      } else {
        throw new Error("Validation failed :: Connection doesn't have permission to perform this operation");
      }
      log.info("Exiting UserAuthService :: getPermissions()");
      return permissions;
    }
    // If invalid for all cases return No permission
    return permissions;
  }

  public static async validateUser(userId: string, contextData: string) {
    log.info("Inside validateUser Method");
    log.info("contextData: " + contextData + " userid: " + userId);
    // Validation disabled for offline mode
    if (contextData.includes("offline")) {
      return { status: true, loggedinId: "offline" };
    }
    let validationStatusObj: any = {
      status: false,
      loggedinId: ""
    };
    if (contextData == "") {
      log.error("Validation failed for: requestContext undefined or empty");
      return validationStatusObj;
    }
    const loggedInUser = contextData.split("CognitoSignIn:");
    if (loggedInUser && loggedInUser.length > 1) {
      const loggedinId = await this.getUserDetails(contextData, Constants.COGNITO_USER_ATTRIBUTE_PROFILE_ID);
      log.info("user id and loggedinID " + userId + " === " + loggedinId);
      if (!loggedinId) {
        log.error("Validation failed for: Profile id missing in cognito");
        return validationStatusObj;
      }
      if (loggedinId === userId) {
        validationStatusObj = {
          status: true,
          loggedinId
        };
      } else {
        log.error("Validation failed: Profile id does not match the user Id");
      }
      return validationStatusObj;
    } else {
      log.error("Validation failed for: Cognito id missing");
      return validationStatusObj;
    }
  }

    /**
     * Looks for the attributeName provided in Cognito.
     * If running in offline mode it return offline-data
     * @param {string} contextData
     * @param {string} attributeName
     * @returns {Promise<string>}
     */
    public static async getUserDetails(contextData: string, attributeName: string): Promise<string> {
    if (contextData.includes("offline")) {
      log.info("Running in offline mode, getUserDetail returning offline-data");
      return "offline-default";
    }
    const userPoolID = contextData.split(",")[0].split("/")[1];
    const userId = contextData.split("CognitoSignIn:")[1];
    log.info("getUserDetails from Cognito for attribute: <" + attributeName + "> userID=" + userId + ", userPoolID=" + userPoolID);
    const region = userPoolID.split("_")[0];
    const cognito = new AWS.CognitoIdentityServiceProvider({
      region
    });
    let attribute: string;
    const user = await cognito
      .listUsers({
        // Handle AWS Error and return a proper response if user is not found
        UserPoolId: userPoolID,
        Filter: 'sub = "' + userId + '"'
      })
      .promise()
      .then((data) => {
        log.info("getUserDetails executed successfully.");
        return data;
      })
      .catch((err) => {
        log.error("Error in getUserDetails", err);
        return err;
      });
    if (user instanceof Error) {
      return "";
    } else {
      if (attributeName === "Username") {
        attribute = user.Users.length > 0 ? user.Users[0].Username : null;
        return attribute;
      }
      await user.Users.forEach(async (data) => {
        const userAttributes = data.Attributes;
        const filterRes = userAttributes.filter((d) => {
          return d.Name === attributeName;
        });
        attribute = filterRes.length ? filterRes[0]["Value"] : "";
      });
      return attribute;
    }
  }

  public static async updateUserGroup(authorizerData: any, futureGroup) {
          const userPoolID = authorizerData.iss.split("/")[3];
          const region = userPoolID.split("_")[0];
          const cognito = new AWS.CognitoIdentityServiceProvider({
              region
          });
          const userName = authorizerData["cognito:username"];
          const currentGroup = authorizerData["cognito:groups"];
          if (currentGroup == futureGroup) {
              log.info("both userGroup and future group are same");
              return {};
          }
          const params = {
              GroupName: currentGroup,
              UserPoolId: userPoolID,
              Username: userName
          };
          const groupRemoveStatus = await cognito
              .adminRemoveUserFromGroup(params)
              .promise()
              .then((data) => {
                  log.info("adminRemoveUserFromGroup executed successfully.");
                  return data;
              })
              .catch((err) => {
                  log.error("Error in adminRemoveUserFromGroup: ", err);
                  return err;
              });
          if (groupRemoveStatus instanceof Error) {
              return groupRemoveStatus;
          } else {
              params.GroupName = futureGroup;
              const groupAddStatus = await cognito
                  .adminAddUserToGroup(params)
                  .promise()
                  .then(async (data) => {
                      log.info("adminRemoveUserFromGroup executed successfully.");
                      const paramsToUpdate = {
                          UserAttributes: [
                              {
                                  Name: "custom:group",
                                  Value: futureGroup
                              }
                          ],
                          UserPoolId: userPoolID,
                          Username: userName
                      };
                      await cognito.adminUpdateUserAttributes(paramsToUpdate).promise();
                      return data;
                  })
                  .catch((err) => {
                      log.error("Error in adminRemoveUserFromGroup: ", err);
                      return err;
                  });
              return groupAddStatus;
          }

  }

  public static async getUserGroup(userName, userPoolID) {
    const region = userPoolID.split("_")[0];
    const cognito = new AWS.CognitoIdentityServiceProvider({
      region
    });
    const user = await cognito
      .adminListGroupsForUser({
        UserPoolId: userPoolID,
        Username: userName
      })
      .promise()
      .then((data) => {
        log.info("getUserGroup executed Successfully");
        return data;
      })
      .catch((err) => {
        log.error("Error in getUserGroup: ", err);
        return err;
      });
    if (user instanceof Error) {
      return null;
    } else {
      return user.Groups.length > 0 ? user.Groups[0].GroupName : null;
    }
  }

  public static async doesUserHaveSameEmail(email: string, userId: string, userPoolId: string): Promise<boolean> {
    if (!userId || userId === "" || !userPoolId || userPoolId === "") {
      // insufficient information to lookup the current user
      return false;
    }
    const username = await this.getUserDetails("", "Username");
    return username && username === email;
  }

  public static async doesUserExistInPool(userPoolID: string, email: string) {
    log.info("Inside doesUserExistInPool function");
    const region = userPoolID.split("_")[0];
    const cognito = new AWS.CognitoIdentityServiceProvider({
      region
    });
    return await cognito
      .listUsers({
        UserPoolId: userPoolID,
        Filter: 'email = "' + email + '"'
      })
      .promise()
      .then((data) => {
        log.info("Data received from cognito");
        log.info(data);
        return data.Users && data.Users.length > 0;
      })
      .catch((err) => {
        log.error("Error in fetching users from cognito", err);
        return err;
      });
  }

  public static async updateUserAttributes(userId: string, userPoolId: string, updatedAttributes: any[]) {
    log.info(
      "updateUserAttributes userId=" +
        userId +
        ", userPoolId=" +
        userPoolId +
        ", updated user attributes=" +
        JSON.stringify(updatedAttributes)
    );
    if (!userId || !userPoolId) {
      log.info("UserId and userPoolId both have to be present to update Cognito user attributes.");
      // TODO: Should we return null?
      return null;
    }
    if (!updatedAttributes || updatedAttributes.length === 0) {
      log.info("No Cognito user attributes available for update.");
      // TODO: Should we return null?
      return null;
    }
    const region = userPoolId.split("_")[0];
    const cognito = new AWS.CognitoIdentityServiceProvider({
      region
    });
    const userName = "";
    const updateRequest: any = {
      UserPoolId: userPoolId,
      Username: userName,
      UserAttributes: updatedAttributes
    };
    // TODO: should the callbacks return something?
    cognito.adminUpdateUserAttributes(updateRequest, (err, data) => {
      if (err) {
        log.error(
          "Could not update user attributes for userId=" +
            userId +
            ", userPoolId=" +
            userPoolId +
            ", attributes=" +
            JSON.stringify(updatedAttributes)
        );
        log.error("Error: " + err.stack);
      } else {
        log.info("Cognito user attributes updated successfully.");
      }
    });
  }
  /**
   * Globally Signs out the user
   * Return true if signed out or else false
   * @param {string} contextData
   * @returns {Promise<boolean>}
   */
  public static async globalSignOutUser(authorizerData: any) {
    const userPoolID = authorizerData.iss.split("/")[3];
    const region = userPoolID.split("_")[0];
    const cognito = new AWS.CognitoIdentityServiceProvider({
      region
    });
    const params = {
      UserPoolId: userPoolID,
      Username: authorizerData["cognito:username"]
    };
    return await cognito
      .adminUserGlobalSignOut(params)
      .promise()
      .then((data) => {
        log.info("successfully logged off the user");
        return true;
      })
      .catch((err) => {
        log.error("Failed to signOut the user " + err);
        return false;
      });
  }

  /**
   * Validate if userId is present in cognito or not and returns profile attribute.
   * @param userId userId to be validated
   * @param contextData AWS context data
   *
   * @returns Returns validationStatusObj with status true if validated successfully.
   */
  public static async validateIncomingUser(userId: string, contextData: string): Promise<string> {
    log.info("Entering UserAuthService :: validateUser()");
    log.debug("contextData: " + contextData + " userid: " + userId);
    // Validation disabled for offline mode
    if (contextData.includes("offline")) {
      return "offline";
    }
    log.info("BaseService :: validateUser() :: User validation initiated");
    const loggedInUser = contextData.split("CognitoSignIn:");
    if (loggedInUser && loggedInUser.length > 1) {
      const loggedinId = await this.getUserDetails(contextData, Constants.COGNITO_USER_ATTRIBUTE_PROFILE_ID);
      log.debug("user id and loggedinID :: ", userId, " === ", loggedinId);
      if (!loggedinId) {
        throw new Error("BaseService :: validateUser() :: Validation failed : Profile id missing in cognito");
      }
      if (loggedinId !== userId) {
        throw new Error("BaseService :: validateUser() :: Validation failed : Profile id does not match the user Id");
      }
      return loggedinId;
    } else {
      throw new Error("BaseService :: validateUser() :: Validation failed : Cognito id missing");
    }
  }
}
