/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import {IFindOptions} from "sequelize-typescript";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { OrganizationLevelDefaults } from "../../models/CPH/OrganizationLevelDefaults/OrganizationLevelDefaults";
import { ResearchSubject } from "../../models/CPH/researchSubject/researchSubject";
import { DAOService } from "../dao/daoService";
import {PolicyManager} from "../policy/policyManager";
import {SubjectAccessRequest} from "../policy/subjectAccessRequest";
import { DataFetch } from "../utilities/dataFetch";
import {AuthorizationRequest} from "./authorizationRequest";

export class AuthService {
  /**
   * TODO: Why do we need a reference when we need to extract id anyways.
   * Wrapper class to perform all User access authentication
   * If requester != requestee, then it will check connection between them,
   * connection type should be of type practitioner/delegate and requester should be of type practitioner/ CarePartner
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
  public static async authorizeRequest(
    requester: string,
    informationSourceReference: string,
    ownerReference: string,
    resourceType: string,
    accessType: string,
    ownerType?: string
  ) {
    log.info("Entering AuthService :: authorizeRequest()");
    // Check if informationSourceReference & ownerReference belongs to userProfile or ResearchStudy
    const researchSubjectCriteria = this.getResearchSubjectFilterCriteria(accessType);
    const researchSubjectProfiles: any = await AuthService.getResearchSubjectProfiles(ownerReference, informationSourceReference, researchSubjectCriteria);
    informationSourceReference = researchSubjectProfiles[informationSourceReference]
      ? researchSubjectProfiles[informationSourceReference]
      : informationSourceReference;
    ownerReference = researchSubjectProfiles[ownerReference] ? researchSubjectProfiles[ownerReference] : ownerReference;
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
    // check 2. is requester the System user. A system user can submit request on its or someone else's behalf
    if (fetchedProfiles[requester] && fetchedProfiles[requester].profileType === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, requester is a system user and submitting request for a valid owner :: authorizeRequest()");
      return [];
    }
    // check 3. is user submitting its own request
    if (requester === informationSourceId && requester === ownerId) {
      log.info("Exiting AuthService, user is submitting request for self :: authorizeRequest()");
      return [];
    }
    // check 4. If resourceType publicly accessible, then no connection check required
    const isPublicResource: boolean = await AuthService.getResourceAccessLevel(resourceType, accessType);
    if (isPublicResource) {
      log.info("Exiting AuthService, Resource type is public :: authorizeRequest()");
      return [];
    }
    // check 5. is Practitioner or Care Partner submitting request for owner
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
      log.info("Exiting AuthService, found a conncetion :: authorizeRequest()");
      return connection;
    } else {
      // can come here if requester is non-System and informationSource==Patient or informationSource!=requester
      log.error("Received a user of unknown profile type");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
  }

  /**
   * Wrapper class to perform all User access authentication based on sharing rules
   * If requester != requestee, It will validate connection between requester and requestee irrespective of user type and requester should be same as InformatioSource
   * handles multiple scenarios, if requester is same as informationSource and patient, all access allowed except system user can't be information source
   * if requester is system user it can post data if it is not informationSource
   * if requester is not system user, a valid connection is expected between informationSource and patient
   * @static
   * @param {AuthorizationRequest} authorizationRequest
   * @memberof AuthService
   * @returns error is throw for any access violation. If [] is return means the requester has unrestricted access.
   *  If [connection] is returned then the access should be determined be evaluating the connection's sharing rules
   */
  public static async authorizeRequestSharingRules(authorizationRequest: AuthorizationRequest) {
    log.info("Entering AuthService :: authorizeRequestSharingRules() requester=" + authorizationRequest.requester +
        ", ownerReference=" + authorizationRequest.ownerReference + ", ");
    // if ownerReference is researchSubject save it for policy check
    const ownerOrignalSubjectReference: string = (authorizationRequest.ownerReference.indexOf(Constants.RESEARCHSUBJECT_REFERENCE) > -1) ?
        authorizationRequest.ownerReference : null;
    // builds a condition for querying ResearchSubject. Example: status: { [Op.notIn]: ["withdrawn", "ineligible", "not-registered"] }
    const researchSubjectCriteria = AuthService.getResearchSubjectFilterCriteria(authorizationRequest.accessType);
    // returns a maps of RS reference to the corresponding profile
    const researchSubjectProfiles: any = await AuthService.getResearchSubjectProfiles(
        authorizationRequest.ownerReference, authorizationRequest.informationSourceReference, researchSubjectCriteria);

    // reset the Request's informationSourceReference with UserProfile reference if ResearchSubject was provided
    authorizationRequest.informationSourceReference = researchSubjectProfiles[authorizationRequest.informationSourceReference] ?
        researchSubjectProfiles[authorizationRequest.informationSourceReference] :
        authorizationRequest.informationSourceReference;

    // reset the Request's ownerReference with UserProfile reference if ResearchSubject was provided
    authorizationRequest.ownerReference = researchSubjectProfiles[authorizationRequest.ownerReference] ?
        researchSubjectProfiles[authorizationRequest.ownerReference] : authorizationRequest.ownerReference;

    // by now the ownerRef and infoSrcRef are both UserProfile
    const informationSourceId = authorizationRequest.informationSourceReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const ownerId = authorizationRequest.ownerReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const requestProfileIds = [authorizationRequest.requester, informationSourceId, ownerId];
    // make sure all provided profiles are active and not deleted. throws error if requestProfileIds was empty
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // check 1. if ownerType is provided check if ownerReference is a valid profile of specified type
    if (authorizationRequest.ownerType && fetchedProfiles[ownerId].profileType !== authorizationRequest.ownerType) {
      log.error("Owner is not a valid " + authorizationRequest.ownerType);
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // check 2. is requester the System user. A system user can submit request on its or someone else's behalf
    // QUESTION: seems like fetchedProfiles[requester] can be null. is this an error state when requests profile was not found?
    if (fetchedProfiles[authorizationRequest.requester] && fetchedProfiles[authorizationRequest.requester].profileType === Constants.SYSTEM_USER) {
      log.info("requester is a system user and it is submitting request for a valid owner");
      return [];
    }
    // check 3. is Patient submitting its own request
    if (authorizationRequest.requester === informationSourceId && authorizationRequest.requester === ownerId) {
      log.info("Exiting AuthService, Patient is submitting its own request :: authorizeRequestSharingRules()");
      return [];
    }
    // QUESTION: Can inforSource be different from requester? is this an error state?
    // check 4. If resourceType publicly accessible, then no connection check required
    const isPublicResource: boolean = await AuthService.getResourceAccessLevel(authorizationRequest.resourceType, authorizationRequest.accessType);
    if (isPublicResource) {
      log.info("Exiting AuthService, Resource type is public :: authorizeRequest()");
      return [];
    }

    // check 4.5 study/site based access control can only be determined if the owner is ResearchSubject
    if (ownerOrignalSubjectReference && authorizationRequest.resourceAction) {
        log.info("AuthService::authorizeRequest() Owner is ResearchSubject, checking for policy based access.");
        const accessRequest: SubjectAccessRequest = {
            requestorReference: Constants.USERPROFILE_REFERENCE + authorizationRequest.requester,
            subjectReference: ownerOrignalSubjectReference,
            resourceAction: authorizationRequest.resourceAction
        };
        const grantedPolicies = await PolicyManager.requestSubjectAccess(accessRequest);
        log.info("Granted policies = " + JSON.stringify(grantedPolicies));
        if (grantedPolicies && grantedPolicies.length > 0) {
            log.info("Exiting AuthService, Policy based access was granted :: authorizeRequest()");
            return [];
        } else {
            log.info("AuthService::authorizeRequest() Policy based access was not granted, checking for connection based access.");
        }
    } else {
        log.info("AuthService::authorizeRequest() Owner is not ResearchSubject or resourceAction was not provided. Skipping to check Connection based access.");
    }

    // check 5. Check for connection between requester and requestee
    // the IF is redundant? profileType will always be non SYSTEM here as per check2
    if (fetchedProfiles[authorizationRequest.requester].profileType != Constants.SYSTEM_USER) {
      log.info("requester is of type Patient/Practitioner/CarePartner and requestee is owner, checking Connection");
      const connectionType = [Constants.CONNECTION_TYPE_FRIEND, Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
      const connectionStatus = [Constants.ACTIVE];
      const connection = await AuthService.hasConnection(ownerId, authorizationRequest.requester, connectionType, connectionStatus);
      // hasConnection has to return any array size>0 to prove valid connection. object inside array is not checked
      if (connection.length < 1) {
        log.error("No connection found between from user and to user");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
      return connection;
    } else {
      // QUESTION: is this block reachable? request==System is handled in check2
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
  public static async authorizeConnectionBased(requesterId: string, requesteeReference: string, resourceType: string, accessType: string) {
    log.info("Inside AuthService :: authorizeConnectionBased()");
    const researchSubjectCriteria = this.getResearchSubjectFilterCriteria(accessType);
    const researchSubjectProfiles: any = await AuthService.getResearchSubjectProfiles(requesteeReference, null, researchSubjectCriteria);
    requesteeReference = researchSubjectProfiles[requesteeReference] ? researchSubjectProfiles[requesteeReference] : requesteeReference;
    const requesteeId = requesteeReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const requestProfileIds = [requesterId, requesteeId];
    // query userprofile for the unique profile ids
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // check 1: if requester should be system user then allow access
    if (fetchedProfiles[requesterId] && fetchedProfiles[requesterId].profileType.toLowerCase() === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, Requester is system user :: hasConnectionBasedAccess");
      return [];
    }
    // check 2. if requester and requestee are the same users then allow access
    if (requesterId == requesteeId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: hasConnectionBasedAccess");
      return [];
    }
    // check 3. If resourceType publicly accessible, then no connection check required
    const isPublicResource: boolean = await AuthService.getResourceAccessLevel(resourceType, accessType);
    if (isPublicResource) {
      log.info("Exiting AuthService, Resource type is public :: authorizeRequest()");
      return [];
    }
    // check 4. if we reached here then a connection has to exist between requester and requestee
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
   * It will perform authorization for get and search methods with sharing rules
   * It will validate the profile ids and check connection between them
   *
   * @static
   * @param {string} to logged in profile ID in format 123
   * @param {string} profileType logged in profile Type
   * @param {string} from patient ID coming from request bundle in format 123
   * @returns/
   * @memberof AuthService
   */
  public static async authorizeConnectionBasedSharingRules(
    requesterId: string,
    requesteeReference: string,
    resourceType: string,
    accessType: string,
    ownerType?: string
  ) {
    log.info("Inside AuthService :: authorizeConnectionBasedSharingRules()");
    const researchSubjectCriteria = this.getResearchSubjectFilterCriteria(accessType);
    const researchSubjectProfiles: any = await AuthService.getResearchSubjectProfiles(requesteeReference, null, researchSubjectCriteria);
    requesteeReference = researchSubjectProfiles[requesteeReference] ? researchSubjectProfiles[requesteeReference] : requesteeReference;
    const requesteeId = requesteeReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const requestProfileIds = [requesterId, requesteeId];
    // query userprofile for the unique profile ids
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // check 1. if ownerType is provided check if ownerReference is a valid profile of specified type
    if (ownerType && fetchedProfiles[requesteeId].profileType !== ownerType) {
      log.error("Owner is not a valid " + ownerType);
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // reaches here if requester and requestee are both valid
    // check 2: if requester should be system user then allow access
    if (fetchedProfiles[requesterId] && fetchedProfiles[requesterId].profileType.toLowerCase() === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, Requester is system user :: authorizeConnectionBasedSharingRules");
      return [];
    }
    // check 3. if requester and requestee are the same users then allow access
    if (requesterId == requesteeId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: authorizeConnectionBasedSharingRules");
      return [];
    }
    // check 4. If resourceType publicly accessible, then no connection check required
    const isPublicResource: boolean = await AuthService.getResourceAccessLevel(resourceType, accessType);
    if (isPublicResource) {
      log.info("Exiting AuthService, Resource type is public :: authorizeRequest()");
      return [];
    }
    // check 5. if we reached here then a connection has to exist between requester and requestee
    log.info("Requester is not a system user. Checking if there is a connection between requester and requestee.");
    const connectionType = [Constants.CONNECTION_TYPE_FRIEND, Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
    const connectionStatus = [Constants.ACTIVE];
    // ToDo hasConnection to getConnection
    const connection = await AuthService.hasConnection(requesteeId, requesterId, connectionType, connectionStatus);
    if (connection.length < 1) {
      log.error("No connection found between from user and to user");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    log.info("Exiting AuthService, requester and requestee are connected  :: authorizeConnectionBasedSharingRules");
    // ToDo return only one connection instead of Array
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
    // TODO: should we check on the requestExpirationDate
    const queryOptions: IFindOptions<Connection> = {
      where: {
        from: {
          reference: from
        },
        to: {
          reference: to
        },
        type,
        status,
        meta: {
          isDeleted: false
        }
      }
    };
    let result = await DAOService.search(Connection, queryOptions);
    result = result.map((eachRecord: any) => eachRecord[Constants.DEFAULT_SEARCH_ATTRIBUTES]);
    log.info("Exiting AuthService :: hasConnection");
    return result;
  }

  /**
   * Validates ResearchSubject profiles reference and returns mapped UserProfile Reference
   * TODO: should this function be in AuthService?
   * TODO: can this function take in one reference and return one reference? but we will have the query the table again.
   * TODO: rename this and add an example of input / output
   * @static
   * @param {string} ownerReference userReference value will be Reference/1234
   * @param {string} informationSourceReference practionerReference value will be Reference/1234
   * @returns examples:
   * 1) if ownerReference:ResearchSubject/12345 and informationSourceReference:ResearchSubject/67890
   *    returns {
   *        "ResearchSubject/12345": "UserProfile/1111",
   *        "ResearchSubject/67890": "UserProfile/2222"
   *    }
   * 2) if ownerReference:ResearchSubject/12345 and informationSourceReference:UserProfile/2222
   *    returns {
   *        "ResearchSubject/12345": "UserProfile/1111"
   *    }
   * 3) if ownerReference:UserProfile/1111 and informationSourceReference:UserProfile/2222
   *    returns { }
   * @memberof AuthService
   */
  public static async getResearchSubjectProfiles(ownerReference: string, informationSourceReference?: string, criteria?: any) {
    const reasearchSubjectProfiles: any = {};
    const reasearchSubjectToUserProfiles: any = {};
    let researchProfileIdx = -1;
    if (ownerReference.indexOf(Constants.RESEARCHSUBJECT_REFERENCE) > -1) {
      reasearchSubjectProfiles[ownerReference] = ownerReference.split(Constants.RESEARCHSUBJECT_REFERENCE)[1];
    }
    if (informationSourceReference && informationSourceReference.indexOf(Constants.RESEARCHSUBJECT_REFERENCE) > -1) {
      reasearchSubjectProfiles[informationSourceReference] = informationSourceReference.split(Constants.RESEARCHSUBJECT_REFERENCE)[1];
    }
    const uniqueProfileIds = _.uniq(Object.values(reasearchSubjectProfiles));
    let whereClause = {
      [Constants.ID]: uniqueProfileIds,
      [Constants.META_IS_DELETED_KEY]: false
    };
    if (criteria) {
      whereClause = Object.assign(whereClause, criteria);
    }
    if (uniqueProfileIds.length) {
      const researchSubjectIdsProfiles = await DataFetch.getUserProfiles(whereClause, ResearchSubject);
      if (uniqueProfileIds.length != researchSubjectIdsProfiles.length) {
        log.error("Error in DataFetch: Record doesn't exists for all requested Reasearch ids");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
      if (reasearchSubjectProfiles[ownerReference]) {
        researchProfileIdx = _.findIndex(researchSubjectIdsProfiles, { [Constants.ID]: reasearchSubjectProfiles[ownerReference] });
        reasearchSubjectToUserProfiles[ownerReference] = researchSubjectIdsProfiles[researchProfileIdx][Constants.INDIVIDUAL][Constants.REFERENCE_ATTRIBUTE];
      }
      if (reasearchSubjectProfiles[informationSourceReference]) {
        researchProfileIdx = _.findIndex(researchSubjectIdsProfiles, { [Constants.ID]: reasearchSubjectProfiles[informationSourceReference] });
        reasearchSubjectToUserProfiles[informationSourceReference] =
          researchSubjectIdsProfiles[researchProfileIdx][Constants.INDIVIDUAL][Constants.REFERENCE_ATTRIBUTE];
      }
    }
    return reasearchSubjectToUserProfiles;
  }

  /**
   * TODO: Remove this into OrganizationLevelDefaultsDAO
   * It will determine accessLevel for a resourceType
   * It will Query OrganizationLevelDefaults, to get accessType for a resource
   * public-read-write: valid user can perform read/write operation without connection
   * public-read-only: valid user can perform read operation without connection
   * private: valid user can perform read/write operation based on sharing rules
   *
   * @static
   * @param {string} resourceType service name
   * @param {string} accessType accessType it will specify endpoint type, which can be read or edit
   * @returns
   * @memberof AuthService
   */
  public static async getResourceAccessLevel(resourceType: string, accessType: string) {
    const permissionMapping = {
      [Constants.PUBLIC_ACCESS_READ_WRITE]: [Constants.ACCESS_READ, Constants.ACCESS_EDIT],
      [Constants.PUBLIC_ACCESS_READ_ONLY]: [Constants.ACCESS_READ]
    };
    const queryOptions = {
      where: { resourceType },
      attributes: [Constants.ACCESS_TYPE]
    };
    const result = await DAOService.search(OrganizationLevelDefaults, queryOptions);
    if (!result.length) {
      log.error("Record not found in OrganizationLevelDefaults Table for resourceType: " + resourceType);
      return false;
    }
    const serviceAccessValue = _.map(result, Constants.ACCESS_TYPE)[0];
    if (permissionMapping[serviceAccessValue] && permissionMapping[serviceAccessValue].indexOf(accessType) > -1) {
      return true;
    }
    return false;
  }

  /**
   * returns addtional filter criteria for researchSubject based on accesstype
   * If AccessType is read, then it won't add any additional criteria
   * If AccessType is edit, then it will add additional criteria for ResearchSubject where status shouldn't be part of Constants.RESEARCH_SUBJECT_WITHDRAW_STATUS
   *
   * @static
   * @param {string} accessType it will specify endpoint type, which can be read or edit
   * @returns
   * @memberof AuthService
   */
  public static getResearchSubjectFilterCriteria(accessType: string) {
    let researchSubjectCriteria;
    if (accessType === Constants.ACCESS_EDIT) {
      researchSubjectCriteria = {
        [Constants.STATUS]: {
          [Op.notIn]: Constants.RESEARCH_SUBJECT_WITHDRAW_STATUS
        }
      };
    }
    return researchSubjectCriteria;
  }

  /**
   * Validate UserProfiles and ResearchSubject profiles
   *
   * @static
   * @param {string[]} profileReferences
   * @param {*} [criteria]
   * @returns
   * @memberof AuthService
   */
  public static async validateProfiles(profileReferences: string[], criteria?: any) {
    log.info("Entering AuthService :: validateProfiles()");
    const userProfileReferences = _.uniq(
      _.filter(profileReferences, (profileReference) => {
        return profileReference.indexOf(Constants.USERPROFILE_REFERENCE) > -1;
      })
    );
    const researchSubjectReferences = _.uniq(
      _.filter(profileReferences, (profileReference) => {
        return profileReference.indexOf(Constants.RESEARCHSUBJECT_REFERENCE) > -1;
      })
    );
    if (researchSubjectReferences.length) {
      let whereClause = {
        [Constants.ID]: _.map(researchSubjectReferences, (researchSubjectReference) => {
          return researchSubjectReference.split(Constants.RESEARCHSUBJECT_REFERENCE)[1];
        }),
        [Constants.META_IS_DELETED_KEY]: false
      };
      if (criteria) {
        whereClause = Object.assign(whereClause, criteria);
      }
      const researchSubjectIdsProfiles = await DataFetch.getUserProfiles(whereClause, ResearchSubject);
      userProfileReferences.push(..._.map(researchSubjectIdsProfiles, Constants.INDIVIDUAL_REFERENCE_KEY).filter(Boolean));
    }
    let validUserProfiles = [];
    if (userProfileReferences.length) {
      validUserProfiles = await DataFetch.getUserProfiles({
        [Constants.ID]: _.uniq(
          _.map(userProfileReferences, (userProfileReference) => {
            return userProfileReference.split(Constants.USERPROFILE_REFERENCE)[1];
          })
        ),
        status: Constants.ACTIVE,
        [Constants.META_IS_DELETED_KEY]: false
      });
      validUserProfiles = _.map(validUserProfiles, Constants.ID);
    }
    log.info("Exiting AuthService :: validateProfiles()");
    return validUserProfiles;
  }

  /**
   * Validate connectionbased sharing rules between loggedin user and requested user
   *
   * @static
   * @param {string} requesterId
   * @param {string[]} requesteeIds
   * @param {string} resourceType
   * @param {string} accessType
   * @returns
   * @memberof AuthService
   */
  public static async authorizeMultipleConnectionsBasedSharingRules(requesterId: string, requesteeIds: string[], resourceType: string, accessType: string) {
    log.info("Entering AuthService :: authorizeMultipleConnectionsBasedSharingRules()");
    // 1 - Check loggedin user
    const fetchedProfiles = await DataFetch.getUserProfile([requesterId]);
    // check 2: if requester should be system user then allow access
    if (fetchedProfiles[requesterId] && fetchedProfiles[requesterId].profileType.toLowerCase() === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, Requester is system user :: authorizeMultipleConnectionsBasedSharingRules");
      return [];
    }
    // check 3. if requester and requestee are the same users then allow access
    if (requesteeIds && requesteeIds.length == 1 && requesteeIds[0].split(Constants.FORWARD_SLASH)[1] == requesterId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: authorizeMultipleConnectionsBasedSharingRules");
      return [];
    }
    // check 4. If resourceType publically accessable, then no connection check required
    const isResoucePublicAccessable: boolean = await AuthService.getResourceAccessLevel(resourceType, accessType);
    if (isResoucePublicAccessable) {
      log.info("Exiting AuthService, Resource type is public :: authorizeMultipleConnectionsBasedSharingRules()");
      return [];
    }
    log.info("Requester is not a system user. validating connection between requester and requestee.");
    const researchSubjectCriteria = this.getResearchSubjectFilterCriteria(accessType);
    const validRequesteeIds = await AuthService.validateProfiles(requesteeIds, researchSubjectCriteria);
    // check 5. if requester accessing his own ResearchSubject then allow access
    if (validRequesteeIds.length == 1 && requesteeIds[0] == requesterId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: authorizeMultipleConnectionsBasedSharingRules");
      return [];
    }
    // check 6. validate connection between requester and requestee
    const connectionType = [Constants.CONNECTION_TYPE_FRIEND, Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
    const connectionStatus = [Constants.ACTIVE];
    const connections = await AuthService.getConnections(validRequesteeIds, requesterId, connectionType, connectionStatus);
    if (connections.length < 1) {
      log.error("No connection found between from user and to user");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    log.info("Exiting AuthService, requester and requestee are connected  :: authorizeMultipleConnectionsBasedSharingRules");
    return connections;
  }

  /**
   * Validate connection between requested users with loggedin user
   *
   * @static
   * @param {string[]} from requested users
   * @param {string} to loggedin user
   * @param {string[]} type connection type
   * @param {string[]} status connection status
   * @returns
   * @memberof AuthService
   */
  public static async getConnections(from: string[], to: string, type: string[], status: string[]) {
    log.info("Entering AuthService :: getConnections()");
    // In connection we store from and to attribute in UserProfile/uuid
    from = from.map((userReference) => {
      return userReference.indexOf(Constants.USERPROFILE_REFERENCE) == -1 ? Constants.USERPROFILE_REFERENCE + userReference : userReference;
    });
    to = to.indexOf(Constants.USERPROFILE_REFERENCE) == -1 ? Constants.USERPROFILE_REFERENCE + to : to;
    const queryOptions = {
      where: {
        "from.reference": {
          [Op.in]: from
        },
        "to.reference": to,
        "type": type,
        "status": status,
        "meta.isDeleted": false
      }
    };
    let result = await DAOService.search(Connection, queryOptions);
    result = result.map((eachRecord: any) => eachRecord[Constants.DEFAULT_SEARCH_ATTRIBUTES]);
    log.info("Exiting AuthService :: getConnections()");
    return result;
  }

  /**
   * Validate if loggedin user is part of search attribute
   *
   * @static
   * @param {string} requestorProfileId loggedin user Id
   * @param {string} resourceOwnerElement Owner element for a resource
   * @param {*} queryParams queryParams received from api
   * @param {string[]} requestedProfiles requested search profiles
   * @param {*} accessType service access type
   * @returns
   * @memberof AuthService
   */
  public static async getFilteredQueryParameter(
    requestorProfileId: string,
    resourceOwnerElement: string,
    queryParams: any,
    requestedProfiles: string[],
    accessType
  ) {
    let researchSubjectProfiles = [];
    const filteredQueryParameter = Object.assign({}, queryParams);
    const researchSubjectReferences = _.uniq(
      _.filter(requestedProfiles, (profileReference) => {
        return profileReference.indexOf(Constants.RESEARCHSUBJECT_REFERENCE) > -1;
      })
    );
    const requestorProfileIdReference =
      requestorProfileId.indexOf(Constants.USERPROFILE_REFERENCE) == -1 ? Constants.USERPROFILE_REFERENCE + requestorProfileId : requestorProfileId;
    if (researchSubjectReferences.length) {
      const individualReference = [Constants.DEFAULT_SEARCH_ATTRIBUTES, Constants.INDIVIDUAL_REFERENCE_KEY].join(Constants.DOT_VALUE);
      let whereClause = {
        [Constants.ID]: _.map(researchSubjectReferences, (researchSubjectReference) => {
          return researchSubjectReference.split(Constants.RESEARCHSUBJECT_REFERENCE)[1];
        }),
        [individualReference]: requestorProfileIdReference,
        [Constants.META_IS_DELETED_KEY]: false
      };
      const criteria = this.getResearchSubjectFilterCriteria(accessType);
      if (criteria) {
        whereClause = Object.assign(whereClause, criteria);
      }
      researchSubjectProfiles = await DAOService.search(ResearchSubject, { where: whereClause });
      researchSubjectProfiles = _.map(researchSubjectProfiles, Constants.ID).filter(Boolean);
      researchSubjectProfiles = researchSubjectProfiles.map((researchSubjectProfile) => {
        return researchSubjectProfile.indexOf(Constants.RESEARCHSUBJECT_REFERENCE) == -1
          ? Constants.RESEARCHSUBJECT_REFERENCE + researchSubjectProfile
          : researchSubjectProfile;
      });
    }
    if (requestedProfiles.indexOf(requestorProfileIdReference) > -1) {
      researchSubjectProfiles.push(requestorProfileIdReference);
    }
    filteredQueryParameter[resourceOwnerElement] =
      researchSubjectProfiles && researchSubjectProfiles.length > 0 ? [researchSubjectProfiles.join(Constants.COMMA_VALUE)].filter(Boolean) : [];
    return filteredQueryParameter;
  }
}
