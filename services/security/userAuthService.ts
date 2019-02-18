import * as log from "lambda-log";
import * as config from "../../common/objects/config";
import { DataSource } from "../../dataSource";
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
    methodType = methodType.toUpperCase();
    if ((permissions && permissions[0] === "*") || permissions.indexOf(methodType) > -1) {
      return true;
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
      permissions = ["*"];
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
        status: ["active"]
      };
      DataSource.addModel(Connection);
      const result: any = await ConnectionService.searchConnection(Connection, query, callerUserProfileId, authorizerData, httpMethod);
      if (result.length) {
        log.info("searchConnection() success in BaseService :: getPermissions()");
        // if profile type doesn't exists in config then return no permission
        permissions = config.connectionTypePermissions[calleruserProfileType] || [];
      } else {
        throw new Error("Validation failed :: Connection doesn't have permission to perform this operation");
      }
      log.info("Exiting UserAuthService :: getPermissions()");
      return permissions;
    }
    // If invalid for all cases return No permission
    return permissions;
  }
}
