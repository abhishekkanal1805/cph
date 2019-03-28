import * as log from "lambda-log";
import { Op } from "sequelize";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { DataSource } from "../../dataSource";
import { Connection } from "../../models/CPH/connection/connection";
import { Utility } from "../common/Utility";
import { ConnectionService } from "../connection/connectionService";

export class UserAuthService {
  /**
   * checking permissions for Practioner/Care partner type user
   * @param {*} accessObj User endpoint access object.
   * @param {string} userId Profile ID of request's reference object
   * @param {string} httpMethod operation that is being performed e.g. POST, GET etc.
   * @param {*} resource operation that is being performed e.g. POST, GET etc.
   *
   * @returns Returns a custom error in case user validation fails.
   */
  public static async performUserAccessValidation(loggedInUserInfo: any, patientIds: string[], patientValidationId: string, resource: any) {
    // 1. are we anywhere checking if loggedinId is same as informationsourceId?
    log.info("Entering UserService :: performMultiUserValidation()");
    // Check user present in cognito or not and get profile Id
    const loggedInId = loggedInUserInfo.loggedinId;
    const loggedInUserType = loggedInUserInfo.profileType.toLowerCase();
    const result = {
      errorRecords: [],
      saveRecords: []
    };
    if (loggedInUserType === "system") {
      result.saveRecords = resource;
    } else if (loggedInUserType === "patient") {
      resource.forEach((record) => {
        if (Utility.getAttributeValue(record, patientValidationId) === "UserProfile/" + loggedInId) {
          result.saveRecords.push(record);
        } else {
          const badRequest = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
          badRequest.clientRequestId = record.meta ? record.meta.clientRequestId : "";
          result.errorRecords.push(badRequest);
        }
      });
    } else if (loggedInUserType === "practitioner" || loggedInUserType === "carepartner") {
      const queryOptions = {
        where: {
          from: {
            [Op.or]: patientIds
          },
          to: loggedInId,
          status: ["active"]
        },
        attributes: ["from"]
      };
      DataSource.addModel(Connection);
      const searchPatientResults = await Connection.findAll(queryOptions);
      resource.forEach((record) => {
        if (searchPatientResults.includes(Utility.getAttributeValue(record, patientValidationId))) {
          // practioner can do all operation if connection exists?
          result.saveRecords.push(record);
        } else {
          const badRequest = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
          badRequest.clientRequestId = record.meta ? record.meta.clientRequestId : "";
          result.errorRecords.push(badRequest);
        }
      });
    }
    return result;
  }

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
    if (calleruserProfileType === "system") {
      permissions = ["READ", "WRITE"];
      log.info("System admin :: Exiting UserAuthService :: getPermissions()");
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
    if (["practitioner", "partner", "deligate", "carepartner"].indexOf(calleruserProfileType) > -1) {
      const query: any = {
        to: callerUserProfileId,
        from: calledUserProfileId,
        status: ["active"]
      };
      DataSource.addModel(Connection);
      const result: any = await ConnectionService.searchConnection(Connection, query, callerUserProfileId, authorizerData, httpMethod);
      if (result.length) {
        log.info("searchConnection() success in BaseService :: getPermissions()");
        permissions = ["READ", "WRITE"];
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
