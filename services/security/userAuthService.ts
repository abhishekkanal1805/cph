import * as AWS from "aws-sdk";
import * as log from "lambda-log";
import { Connection } from "../../models/CPH/connection/connection";
import { ConnectionService } from "../connection/connectionService";

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
    log.debug("callerUserProfileId ::", callerUserProfileId, "calledUserProfileId ::", calledUserProfileId, "calleruserProfileType ::", calleruserProfileType);
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
      const result: any = await ConnectionService.searchConnection(Connection, query, callerUserProfileId, authorizerData, httpMethod);
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

  public static async doesUserHaveSameEmail(email: string, userId: string, userPoolId: string): Promise<boolean> {
    if (!userId || userId === "" || !userPoolId || userPoolId === "") {
      // insufficient information to lookup the current user
      return false;
    }
    const username = await this.getUserDetails("", "Username");
    return username && username === email;
  }

  public static async updateUserAttributes(userId: string, userPoolId: string, updatedAttributes: any[]) {
    log.info("updateUserAttributes userId=" + userId + ", userPoolId=" + userPoolId + ", updated user attributes=" + JSON.stringify(updatedAttributes));
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
        log.error("Could not update user attributes for userId=" + userId + ", userPoolId=" + userPoolId + ", attributes=" + JSON.stringify(updatedAttributes));
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
}
