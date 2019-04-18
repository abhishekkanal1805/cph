import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { DAOService } from "../dao/daoService";
import { DataFetch } from "../utilities/dataFetch";

export class AuthService {
  /**
   *  Wrapper class to perform all User access authentication
   * handles multiple scenarios, if requester is same as informationSource and patient, all access allowed except system user can't be information source
   * if requester is system user it can post data if it is not informationSource
   * if requester is not system user, a valid connection is expected between informationSource and patient
   * @static
   * @param {string} profile profileId of logged in User
   * @param {string[]} informationSourceIds User Id references in format UserProfile/123
   * @param {string[]} patientIds patientId references in format UserProfile/123
   * @memberof AuthService
   */

  public static async authorizeRequest(requester: string, informationSourceReference: string, patientReference: string) {
    log.info("Entering AuthService :: performAuthorization()");
    const informationSourceId = informationSourceReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const patientId = patientReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const requestProfileIds = [requester, informationSourceId, patientId];
    // query userprofile for the unique profile ids
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // check 1. if patientReference is a valid profile of patient
    if (fetchedProfiles[patientId].profileType != Constants.PATIENT_USER ) {
      log.error("Patient is not a valid active patient");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // check 2. is Patient submitting its own request
    if (requester === informationSourceId && requester === patientId) {
      log.info("Exiting AuthService, Patient is submitting its own request :: hasConnectionBasedAccess()");
      return;
    }
    // check 3. is Practitioner or Care Partner submitting request for patient
    const fetchedInformationSourceProfile = fetchedProfiles[informationSourceId];
    if ((fetchedProfiles[requester].profileType != Constants.SYSTEM_USER) && (fetchedInformationSourceProfile.profileType === Constants.PRACTITIONER_USER
        || fetchedInformationSourceProfile.profileType === Constants.CAREPARTNER_USER)) {
      log.info("requester is of type Practitioner or Care Partner and requestee is Patient, checking Connection");
      const connectionType = [Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
      const connectionStatus = [Constants.ACTIVE];
      await this.hasConnection(patientReference, informationSourceReference, connectionType, connectionStatus);
     } else if (fetchedProfiles[requester].profileType === Constants.SYSTEM_USER) {
      // check 4. is requester the System user. A system user can submit request on its or someone else's behalf
      log.info("requester is a system user and it is submitting request for a valid patient");
      return ;
    } else {
      log.error("Received a user of unknown profile type");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }

  /**
   *
   *
   * @static
   * @param {string} to logged in profile ID in format UserProfile/123
   * @param {string} profileType logged in profile Type
   * @param {string} from patient ID coming from request bundle in format UserProfile/123
   * @returns/
   * @memberof AuthService
   */
  public static async hasConnectionBasedAccess(requester: string, requestee: string) {
    log.info("Inside AuthService :: hasConnectionBasedAccess()");
    const informationSourceId = requester.split(Constants.USERPROFILE_REFERENCE)[1];
    const patientId = requestee.split(Constants.USERPROFILE_REFERENCE)[1];
    const requestProfileIds = [requester, informationSourceId, patientId];

    // query userprofile for the unique profile ids
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // check 1. is requester and requestee same users
    if (fetchedProfiles[requester].profileId == fetchedProfiles [requestee].profileId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: hasConnectionBasedAccess");
      return;
    }
    // check 2. if requester and requestee are not same, a connection has to exist between them or requester should be system user
    if (fetchedProfiles[requester].profileType.toLowerCase() !== Constants.SYSTEM_USER) {
      log.info ("requester is not a system user and now checking if there is a connection between requester and requestee");
      const connectionType = [Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
      const connectionStatus = [Constants.ACTIVE];
      await this.hasConnection(requestee, requester, connectionType, connectionStatus);
    }
    log.info("Exiting AuthService :: hasConnectionBasedAccess");
  }

  /**
   *
   * checks if a connection exists between two users
   * @static
   * @param {string} from profile ID in format UserProfile/123
   * @param {string} to patient ID in format UserProfile/123
   * @returns/
   * @memberof AuthService
   */
  public static async hasConnection(from: string, to: string, type: string[], status: string[]) {
    log.info("Inside AuthService :: hasConnection()");
    const queryOptions = {
      where: {
        "from.reference": from,
        "to.reference": to,
        "type" : type,
        "status": status
      }
    };
    const count = await DAOService.recordsCount(queryOptions, Connection);
    if (count != 1) {
      log.error("No connection found between from user and to user");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    log.info("Exiting AuthService :: hasConnection");
  }
}
