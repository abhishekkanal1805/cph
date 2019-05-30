import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { DAOService } from "../dao/daoService";
import { DataFetch } from "../utilities/dataFetch";

export class AuthService {
  /**
   * TODO: Why do we need a reference when we need to extract id anyways.
   *  Wrapper class to perform all User access authentication
   * handles multiple scenarios, if requester is same as informationSource and patient, all access allowed except system user can't be information source
   * if requester is system user it can post data if it is not informationSource
   * if requester is not system user, a valid connection is expected between informationSource and patient
   * @static
   * @param {string} requester profileId of logged in User
   * @param {string} informationSourceReference Reference in format UserProfile/123 for the user who is the submittingor requesting the record
   * @param {string} ownerReference Reference in format UserProfile/123 for the user who is the record owner
   * @param {string} ownerType optional. if provided can be used to enforce the profileType of ownerReference. Forbidden error is throw if
   * they dont matach. If not provided owner profileType is not checked/enforced.
   * @memberof AuthService
   */
  public static async authorizeRequest(requester: string, informationSourceReference: string, ownerReference: string, ownerType?: string) {
    log.info("Entering AuthService :: performAuthorization()");
    const informationSourceId = informationSourceReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const ownerId = ownerReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const requestProfileIds = [requester, informationSourceId, ownerId];
    // query userprofile for the unique profile ids
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // check 1. if ownerType is provided check if ownerReference is a valid profile of specified type
    if (ownerType && fetchedProfiles[ownerId].profileType !== ownerType) {
      log.error("Owner is not a valid " + ownerType);
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // check 2. is Patient submitting its own request
    if (requester === informationSourceId && requester === ownerId) {
      log.info("Exiting AuthService, Patient is submitting its own request :: hasConnectionBasedAccess()");
      return [];
    }
    // check 3. is Practitioner or Care Partner submitting request for owner
    const fetchedInformationSourceProfile = fetchedProfiles[informationSourceId];
    if (
      fetchedProfiles[requester].profileType != Constants.SYSTEM_USER &&
      (fetchedInformationSourceProfile.profileType === Constants.PRACTITIONER_USER ||
        fetchedInformationSourceProfile.profileType === Constants.CAREPARTNER_USER) &&
      requester === informationSourceId
    ) {
      log.info("requester is of type Practitioner or Care Partner and requestee is owner, checking Connection");
      const connectionType = [Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
      const connectionStatus = [Constants.ACTIVE];
      const connection = await AuthService.hasConnection(ownerReference, informationSourceReference, connectionType, connectionStatus);
      // hasConnection has to return any array size>0 to prove valid connection. object inside array is not checked
      if (connection.length < 1) {
        log.error("No connection found between from user and to user");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
      return connection;
    } else if (fetchedProfiles[requester].profileType === Constants.SYSTEM_USER) {
      // Maybe this can be moved to the top because if request is System user then it does not matter what the other variables are.
      // check 4. is requester the System user. A system user can submit request on its or someone else's behalf
      log.info("requester is a system user and it is submitting request for a valid owner");
      return [];
    } else {
      // can come here if requester is non-System and informationSource==Patient or informationSource!=requester
      log.error("Received a user of unknown profile type");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }

  /**
   * It will perform authorization for get and search methods
   * It will validate the profile ids and check connection between them
   *
   * @static
   * @param {string} to logged in profile ID in format 123
   * @param {string} profileType logged in profile Type
   * @param {string} from patient ID coming from request bundle in format 123
   * @returns/
   * @memberof AuthService
   */
  public static async authorizeConnectionBased(requesterId: string, requesteeId: string) {
    log.info("Inside AuthService :: authorizeConnectionBased()");
    const requestProfileIds = [requesterId, requesteeId];
    // query userprofile for the unique profile ids
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // reaches here if requester and requestee are both valid profiles

    // check 1. if requester and requestee are the same users then allow access
    if (requesterId == requesteeId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: hasConnectionBasedAccess");
      return [];
    }

    // check 2: if requester should be system user then allow access
    if (fetchedProfiles[requesterId].profileType.toLowerCase() === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, Requester is system user :: hasConnectionBasedAccess");
      return [];
    }

    // check 3. if we reached here then a connection has to exist between requester and requestee
    log.info("Requester is not a system user. Checking if there is a connection between requester and requestee.");
    const connectionType = [Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
    const connectionStatus = [Constants.ACTIVE];
    const connection = await AuthService.hasConnection(requesteeId, requesterId, connectionType, connectionStatus);
    if (connection.length < 1) {
      log.error("No connection found between from user and to user");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    log.info("Exiting AuthService, requester and requestee are connected  :: hasConnectionBasedAccess");
    return connection;
  }

  /**
   * It will perform authorization for get and search methods
   * It will validate the profile ids and check connection between them
   *
   * @static
   * @param {string} to logged in profile ID in format 123
   * @param {string} profileType logged in profile Type
   * @param {string} from patient ID coming from request bundle in format 123
   * @returns/
   * @memberof AuthService
   */
  public static async authorizeConnectionBasedSharingRules(requesterId: string, requesteeId: string) {
    log.info("Inside AuthService :: authorizeConnectionBasedSharingRules()");
    const requestProfileIds = [requesterId, requesteeId];
    // query userprofile for the unique profile ids
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // reaches here if requester and requestee are both valid profiles

    // check 1. if requester and requestee are the same users then allow access
    if (requesterId == requesteeId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: authorizeConnectionBasedSharingRules");
      return [];
    }

    // check 2: if requester should be system user then allow access
    if (fetchedProfiles[requesterId].profileType.toLowerCase() === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, Requester is system user :: authorizeConnectionBasedSharingRules");
      return [];
    }

    // check 3. if we reached here then a connection has to exist between requester and requestee
    log.info("Requester is not a system user. Checking if there is a connection between requester and requestee.");
    const connectionType = [Constants.CONNECTION_TYPE_FRIEND, Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
    const connectionStatus = [Constants.ACTIVE];
    const connection = await AuthService.hasConnection(requesteeId, requesterId, connectionType, connectionStatus);
    if (connection.length < 1) {
      log.error("No connection found between from user and to user");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    log.info("Exiting AuthService, requester and requestee are connected  :: authorizeConnectionBasedSharingRules");
    return connection;
  }

  /**
   * checks if a connection exists between two users
   * @static
   * @param {string} from profile is accepted in ID and reference format
   * @param {string} to patient ID is accepted in ID and reference format
   * @returns/
   * @memberof AuthService
   */
  public static async hasConnection(from: string, to: string, type: string[], status: string[]) {
    log.info("Inside AuthService :: hasConnection()");
    // In connection we store from and to attribute in UserProfile/uuid
    from = from.indexOf(Constants.USERPROFILE_REFERENCE) == -1 ? Constants.USERPROFILE_REFERENCE + from : from;
    to = to.indexOf(Constants.USERPROFILE_REFERENCE) == -1 ? Constants.USERPROFILE_REFERENCE + to : to;
    // TODO: use IFindOption<Connection>
    const queryOptions = {
      where: {
        "from.reference": from,
        "to.reference": to,
        "type": type,
        "status": status
      }
    };
    let result = await DAOService.search(Connection, queryOptions);
    result = result.map((eachRecord: any) => eachRecord[Constants.DEFAULT_SEARCH_ATTRIBUTES]);
    log.info("Exiting AuthService :: hasConnection");
    return result;
  }
}
