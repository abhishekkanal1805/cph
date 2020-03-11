/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { IFindOptions } from "sequelize-typescript";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { OrganizationLevelDefaults } from "../../models/CPH/OrganizationLevelDefaults/OrganizationLevelDefaults";
import { PolicyDataResource } from "../../models/CPH/policy/policyDataResource";
import { ResearchSubject } from "../../models/CPH/researchSubject/researchSubject";
import { DAOService } from "../dao/daoService";
import { PolicyManager } from "../policy/policyManager";
import { ResourceAccessResponse } from "../policy/resourceAccessResponse";
import { SubjectAccessRequest } from "../policy/subjectAccessRequest";
import { DataFetch } from "../utilities/dataFetch";
import { ReferenceUtility } from "../utilities/referenceUtility";
import { AuthorizationRequest } from "./authorizationRequest";

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
    log.info(
      "Entering AuthService :: authorizeRequestSharingRules() requester=" +
        authorizationRequest.requester +
        ", ownerReference=" +
        authorizationRequest.ownerReference +
        ", "
    );

    // check 1. if loggedin user is a valid profile
    const requesterDetails: any = await DataFetch.getUserProfile([authorizationRequest.requester]);
    const profileReferences = [authorizationRequest.ownerReference, authorizationRequest.informationSourceReference];
    // check 2. is requester the System user. A system user can submit request on its or someone else's behalf
    if (requesterDetails[authorizationRequest.requester] && requesterDetails[authorizationRequest.requester].profileType === Constants.SYSTEM_USER) {
      await this.validateProfileReferences(profileReferences, authorizationRequest.accessType);
      log.info("requester is a system user and it is submitting request for a valid owner");
      return [];
    }

    // check 3. If resourceType publicly accessible, then no connection check required
    const isPublicResource: boolean = await AuthService.getResourceAccessLevel(authorizationRequest.resourceType, authorizationRequest.accessType);
    if (isPublicResource) {
      await this.validateProfileReferences(profileReferences, authorizationRequest.accessType);
      log.info("Exiting AuthService, Resource type is public :: authorizeRequestSharingRules()");
      return [];
    }

    // check 4. If resourceType is Private, then it should have ownerReference & informationSourceReference
    if (!authorizationRequest.ownerReference || !authorizationRequest.informationSourceReference) {
      log.error("Owner or information source is required for a non-public resource.");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }

    // if ownerReference is researchSubject save it for policy check
    const ownerOrignalSubjectReference: string =
      authorizationRequest.ownerReference.indexOf(Constants.RESEARCHSUBJECT_REFERENCE) > -1 ? authorizationRequest.ownerReference : null;
    // builds a condition for querying ResearchSubject. Example: status: { [Op.notIn]: ["withdrawn", "ineligible", "not-registered"] }
    const researchSubjectCriteria = AuthService.getResearchSubjectFilterCriteria(authorizationRequest.accessType);
    // returns a maps of RS reference to the corresponding profile
    const researchSubjectProfiles: any = await AuthService.getResearchSubjectProfiles(
      authorizationRequest.ownerReference,
      authorizationRequest.informationSourceReference,
      researchSubjectCriteria
    );

    // reset the Request's informationSourceReference with UserProfile reference if ResearchSubject was provided
    authorizationRequest.informationSourceReference = researchSubjectProfiles[authorizationRequest.informationSourceReference]
      ? researchSubjectProfiles[authorizationRequest.informationSourceReference]
      : authorizationRequest.informationSourceReference;

    // reset the Request's ownerReference with UserProfile reference if ResearchSubject was provided
    authorizationRequest.ownerReference = researchSubjectProfiles[authorizationRequest.ownerReference]
      ? researchSubjectProfiles[authorizationRequest.ownerReference]
      : authorizationRequest.ownerReference;

    // by now the ownerRef and infoSrcRef are both UserProfile
    const informationSourceId = authorizationRequest.informationSourceReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const ownerId = authorizationRequest.ownerReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const requestProfileIds = [authorizationRequest.requester, informationSourceId, ownerId];
    // make sure all provided profiles are active and not deleted. throws error if requestProfileIds was empty
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // check 5. if ownerType is provided check if ownerReference is a valid profile of specified type
    if (authorizationRequest.ownerType && fetchedProfiles[ownerId].profileType !== authorizationRequest.ownerType) {
      log.error("Owner is not a valid " + authorizationRequest.ownerType);
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // check 6. is Patient submitting its own request
    if (authorizationRequest.requester === informationSourceId && authorizationRequest.requester === ownerId) {
      log.info("Exiting AuthService, Patient is submitting its own request :: authorizeRequestSharingRules()");
      return [];
    }
    // check 7. study/site based access control can only be determined if the owner is ResearchSubject
    // TODO: maybe we should not limit policy based access check based on presence of subject reference.
    // TODO: invoke policyManger.requestResourceScopedAccess if subject is not there but resource is provided
    // This is okay only if this function is only called from clinical resource perspective.
    if (ownerOrignalSubjectReference && authorizationRequest.resourceActions) {
      log.info("AuthService::authorizeRequestSharingRules() Owner is ResearchSubject, checking for policy based access.");
      const accessRequest: SubjectAccessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + authorizationRequest.requester,
        subjectReferences: [ownerOrignalSubjectReference],
        resourceActions: authorizationRequest.resourceActions
      };
      const grantedPolicies: Map<string, PolicyDataResource[]> = await PolicyManager.requestSubjectScopedAccess(accessRequest);
      if (grantedPolicies && grantedPolicies.size > 0 && grantedPolicies.has(ownerOrignalSubjectReference)) {
        log.info("Exiting AuthService, Policy based access was granted :: authorizeRequestSharingRules()");
        return [];
      } else {
        log.info("AuthService::authorizeRequestSharingRules() Policy based access was not granted, checking for connection based access.");
      }
    } else {
      log.info(
        "AuthService::authorizeRequestSharingRules() Owner is not ResearchSubject or resourceAction was not provided. Skipping to check Connection based access."
      );
    }

    // check 8. Check for connection between requester and requestee
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
   * @param {AuthorizationRequest} authorizationRequest
   * @returns/
   * @memberof AuthService
   */
  public static async authorizeConnectionBasedSharingRules(authorizationRequest: AuthorizationRequest) {
    log.info(
      "Entering AuthService :: authorizeConnectionBasedSharingRules() requester=" +
        authorizationRequest.requester +
        ", ownerReference=" +
        authorizationRequest.ownerReference +
        ", "
    );
    // check 1. if loggedin user is a valid profile
    const requesterDetails: any = await DataFetch.getUserProfile([authorizationRequest.requester]);
    const profileReferences = [authorizationRequest.ownerReference, authorizationRequest.informationSourceReference];

    // check 2. is requester the System user. A system user can submit request on its or someone else's behalf
    if (requesterDetails[authorizationRequest.requester] && requesterDetails[authorizationRequest.requester].profileType === Constants.SYSTEM_USER) {
      await this.validateProfileReferences(profileReferences, authorizationRequest.accessType);
      log.info("requester is a system user and it is submitting request for a valid owner");
      return [];
    }

    // check 3. If resourceType publicly accessible, then no connection check required
    const isPublicResource: boolean = await AuthService.getResourceAccessLevel(authorizationRequest.resourceType, authorizationRequest.accessType);
    if (isPublicResource) {
      await this.validateProfileReferences(profileReferences, authorizationRequest.accessType);
      log.info("Exiting AuthService, Resource type is public :: authorizeRequestSharingRules()");
      return [];
    }

    // check 4. If resourceType is Private, then it should have ownerReference
    if (!authorizationRequest.ownerReference) {
      log.error("Owner or information source is required for a non-public resource.");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    const researchSubjectCriteria = AuthService.getResearchSubjectFilterCriteria(authorizationRequest.accessType);
    const researchSubjectProfiles: any = await AuthService.getResearchSubjectProfiles(authorizationRequest.ownerReference, null, researchSubjectCriteria);
    const requesteeReference = researchSubjectProfiles[authorizationRequest.ownerReference]
      ? researchSubjectProfiles[authorizationRequest.ownerReference]
      : authorizationRequest.ownerReference;
    const requesteeId = requesteeReference.split(Constants.USERPROFILE_REFERENCE)[1];
    const requestProfileIds = [authorizationRequest.requester, requesteeId];
    // query userprofile for the unique profile ids
    const fetchedProfiles = await DataFetch.getUserProfile(requestProfileIds);
    // check 5. if ownerType is provided check if ownerReference is a valid profile of specified type
    if (authorizationRequest.ownerType && fetchedProfiles[requesteeId].profileType !== authorizationRequest.ownerType) {
      log.error("Owner is not a valid " + authorizationRequest.ownerType);
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // check 6. if requester and requestee are the same users then allow access
    if (authorizationRequest.requester == requesteeId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: authorizeConnectionBasedSharingRules");
      return [];
    }
    // check 7. study/site based access control can only be determined if the owner is ResearchSubject
    // TODO: maybe we should not limit policy based access check based on presence of subject reference.
    // TODO: invoke policyManger.requestResourceScopedAccess if subject is not there but resource is provided
    // This is okay only if this function is only called from clinical resource perspective.
    if (authorizationRequest.ownerReference.indexOf(Constants.RESEARCHSUBJECT_REFERENCE) > -1 && authorizationRequest.resourceActions) {
      log.info("AuthService::authorizeConnectionBasedSharingRules() Owner is ResearchSubject, checking for policy based access.");
      const accessRequest: SubjectAccessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + authorizationRequest.requester,
        subjectReferences: [authorizationRequest.ownerReference],
        resourceActions: authorizationRequest.resourceActions
      };
      const grantedPolicies: Map<string, PolicyDataResource[]> = await PolicyManager.requestSubjectScopedAccess(accessRequest);
      if (grantedPolicies && grantedPolicies.size > 0 && grantedPolicies.has(authorizationRequest.ownerReference)) {
        log.info("Exiting AuthService, Policy based access was granted :: authorizeConnectionBasedSharingRules()");
        return [];
      } else {
        log.info("AuthService::authorizeConnectionBasedSharingRules() Policy based access was not granted, checking for connection based access.");
      }
    } else {
      log.info(
        "AuthService::authorizeConnectionBasedSharingRules() Owner is not ResearchSubject or resourceAction was not provided. Skipping to check Connection based access."
      );
    }

    // check 8. if we reached here then a connection has to exist between requester and requestee
    log.info("Requester is not a system user. Checking if there is a connection between requester and requestee.");
    const connectionType = [Constants.CONNECTION_TYPE_FRIEND, Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
    const connectionStatus = [Constants.ACTIVE];
    // ToDo hasConnection to getConnection
    const connection = await AuthService.hasConnection(requesteeId, authorizationRequest.requester, connectionType, connectionStatus);
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
    // In connection we store from and to values as UserProfile references
    from = ReferenceUtility.convertToResourceReference(from, Constants.USERPROFILE_REFERENCE);
    to = ReferenceUtility.convertToResourceReference(to, Constants.USERPROFILE_REFERENCE);
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
    const userProfileReferences = ReferenceUtility.getUniqueReferences(profileReferences, Constants.USERPROFILE_REFERENCE);
    const researchSubjectReferences = ReferenceUtility.getUniqueReferences(profileReferences, Constants.RESEARCHSUBJECT_REFERENCE);

    // get user profiles for the subjects
    const subjectToProfileMap = {};
    userProfileReferences.forEach((eachProfile) => {
      subjectToProfileMap[eachProfile] = [eachProfile];
    });
    if (researchSubjectReferences.length) {
      let whereClause = {
        [Constants.ID]: ReferenceUtility.convertToResourceIds(researchSubjectReferences, Constants.RESEARCHSUBJECT_REFERENCE),
        [Constants.META_IS_DELETED_KEY]: false
      };
      if (criteria) {
        whereClause = Object.assign(whereClause, criteria);
      }
      const researchSubjectIdsProfiles = await DataFetch.getUserProfiles(whereClause, ResearchSubject);
      researchSubjectIdsProfiles.forEach((eachSubject) => {
        const profile = _.get(eachSubject, Constants.INDIVIDUAL_REFERENCE_KEY);
        if (!subjectToProfileMap[profile]) {
          subjectToProfileMap[profile] = userProfileReferences.includes(profile) ? [profile] : [];
        }
        subjectToProfileMap[profile].push(Constants.RESEARCHSUBJECT_REFERENCE + eachSubject.id);
      });
      userProfileReferences.push(...Object.keys(subjectToProfileMap).filter(Boolean));
    }
    let validUserProfiles = [];
    if (userProfileReferences.length) {
      validUserProfiles = await DataFetch.getUserProfiles({
        [Constants.ID]: _.uniq(
          _.map(userProfileReferences, (userProfileReference) => {
            return userProfileReference.indexOf(Constants.USERPROFILE_REFERENCE) == -1
              ? userProfileReference
              : userProfileReference.split(Constants.USERPROFILE_REFERENCE)[1];
          })
        ),
        status: Constants.ACTIVE,
        [Constants.META_IS_DELETED_KEY]: false
      });
      validUserProfiles = _.map(validUserProfiles, Constants.ID);
    }
    Object.keys(subjectToProfileMap).forEach((profile: string) => {
      if (!validUserProfiles.includes(profile.split(Constants.USERPROFILE_REFERENCE)[1])) {
        delete subjectToProfileMap[profile];
      }
    });
    log.info("Exiting AuthService :: validateProfiles()");
    return subjectToProfileMap;
  }

  /**
   * For admin/public endpoint it will validate if owner & informationSource references are valid or not
   *
   * @static
   * @param {AuthorizationRequest} authorizationRequest
   * @memberof AuthService
   */
  public static async validateProfileReferences(profileReferences: string[], accessType: string) {
    log.info("Entering AuthService :: validateOwnerReferences()");
    let filteredReferences = profileReferences.filter(Boolean);
    if (!filteredReferences.length) {
      log.info("No references present to validate");
      return;
    }
    if (accessType == Constants.ACCESS_READ) {
      log.info("Access type is read, we won't won't validate researchsubject references");
      return;
    }
    // Validate all UserProfile/ResearchSubject profiles
    filteredReferences = filteredReferences.filter((eachProfile: string) => {
      const profileArray = eachProfile.split(Constants.FORWARD_SLASH);
      if (profileArray.length === 1) {
        return true;
      }
      return [Constants.USER_PROFILE, Constants.RESEARCH_SUBJECT].includes(profileArray[0]);
    });
    // Get research subject criteria for edit/read access type
    const researchSubjectCriteria = AuthService.getResearchSubjectFilterCriteria(accessType);
    filteredReferences = [...new Set(filteredReferences)];
    const subjectToProfileMap = await AuthService.validateProfiles(filteredReferences, researchSubjectCriteria);
    let uniqReferences: any = Object.values(subjectToProfileMap);
    uniqReferences = [...new Set(uniqReferences.flat())];
    if (uniqReferences.length != filteredReferences.length) {
      log.error("Error in DataFetch: Record doesn't exists for all requested profile ids");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    log.info("Exiting AuthService :: validateOwnerReferences()");
  }
  /**
   * Validate connectionbased sharing rules between loggedin user and requested user
   *
   * @static
   * @param {string} requesterId
   * @param {string[]} requesteeIds
   * @param {string} resourceType
   * @param {string} accessType
   * @returns 1) [] is returned for admin user, when requester is self, their own subject references or if resource is set public.
   * This indicates full access for all the requested subjects. Sharing rules check not required.
   * 2) returns the list of Connections for when at least one was found between the requested
   * 3) if no connections found then throws error
   * @memberof AuthService
   */
  public static async authorizeMultipleConnectionsBased(
    requesterId: string,
    requesteeIds: string[],
    resourceType: string,
    accessType: string,
    resourceActions?: string[]
  ) {
    const authResponse = {
      fullAuthGranted: true,
      authorizedConnections: [],
      authorizedRequestees: [],
      subjectToProfileMap: {}
    };
    log.info("Entering AuthService :: authorizeMultipleConnectionsBasedSharingRules()");
    // 1 - Check loggedin user
    const fetchedProfiles = await DataFetch.getUserProfile([requesterId]);

    // check 2: if requester should be system user then allow access
    if (fetchedProfiles[requesterId] && fetchedProfiles[requesterId].profileType.toLowerCase() === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, Requester is system user :: authorizeMultipleConnectionsBasedSharingRules");
      return authResponse;
    }

    // check 3. if requester and requestee are the same users then allow access
    if (requesteeIds && requesteeIds.length == 1 && requesteeIds[0].split(Constants.FORWARD_SLASH)[1] == requesterId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: authorizeMultipleConnectionsBasedSharingRules");
      return authResponse;
    }

    const researchSubjectCriteria = this.getResearchSubjectFilterCriteria(accessType);
    // FIXME: identify subjects with valid profiles and only used those for Policy check
    const subjectToProfileMap = await AuthService.validateProfiles(requesteeIds, researchSubjectCriteria);
    const validRequesteeIds = Object.keys(subjectToProfileMap);
    authResponse.subjectToProfileMap = subjectToProfileMap;

    // check 4. if requester accessing his own ResearchSubject then allow access
    if (validRequesteeIds.length == 1 && requesteeIds[0] == requesterId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: authorizeMultipleConnectionsBasedSharingRules");
      return authResponse;
    }
    log.info("AuthService:: validRequesteeIds = ", validRequesteeIds);
    // if we are here means full auth was not granted. Determining the partial Auth
    authResponse.fullAuthGranted = false;

    // check 5. check if any references belong to the owner, no need to check policies for them
    const requesterOwnedReferences = await AuthService.getRequesterOwnedReferences(requesterId, requesteeIds, Constants.ACCESS_READ);
    log.info("AuthService:: requesterOwnedReferences = ", requesterOwnedReferences);
    authResponse.authorizedRequestees = requesterOwnedReferences;

    // check 6. study/site based access control can only be determined if the owner is ResearchSubject
    // TODO: maybe we should not limit policy based access check based on presence of subject reference.
    // TODO: invoke policyManger.requestResourceScopedAccess if subject is not there but resource is provided
    // This is okay only if this function is only called from clinical resource perspective.
    // if we use requesteeIds the UserProfile for these subjects may not be valid
    const requesteeIdsForAccessCheck = ReferenceUtility.removeReferences(requesteeIds, requesterOwnedReferences);
    log.info("AuthService:: requesteeForAccessCheck = ", requesteeIdsForAccessCheck);
    const uniqueSubjectReferences = ReferenceUtility.getUniqueReferences(requesteeIdsForAccessCheck, Constants.RESEARCHSUBJECT_REFERENCE);
    log.info("AuthService:: uniqueSubjectReferences = ", uniqueSubjectReferences);
    // let allowedSubjects: string[] = null;
    if (uniqueSubjectReferences.length > 0 && resourceActions) {
      log.info("AuthService::authorizeMultipleConnectionsBasedSharingRules() Owner is ResearchSubject, checking for policy based access.");
      const accessRequest: SubjectAccessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + requesterId,
        subjectReferences: uniqueSubjectReferences,
        resourceActions
      };
      const grantedPolicies: Map<string, PolicyDataResource[]> = await PolicyManager.requestSubjectScopedAccess(accessRequest);
      if (grantedPolicies && grantedPolicies.size > 0) {
        log.info("AuthService:: Policy based access was granted to some or all of the subjects.)");
        const accessGrantedSubjects = Array.from(grantedPolicies.keys());
        log.info("AuthService:: accessGrantedSubjects = ", accessGrantedSubjects);
        authResponse.authorizedRequestees = authResponse.authorizedRequestees.concat(accessGrantedSubjects);
      } else {
        log.info("AuthService:: Policy based access was not granted, checking for connection based access.");
      }
    } else {
      log.info("AuthService:: Owner is not ResearchSubject or resourceAction was not provided. Skipping to check Connection based access.");
    }

    log.info("AuthService:: authResponse.authorizedRequestees = ", authResponse.authorizedRequestees);
    // remove the subjects that already were granted access from the connection check
    // FIXME:BUG if some or any of the subject were granted policy access, their user profiles should be removed from this list
    // FIXME: UserProfile for the respective subject can only stay if there is still at least one subject left for whom policy access was denied
    const requesteeIdsForConnectionCheck = ReferenceUtility.removeReferences(validRequesteeIds, authResponse.authorizedRequestees);
    log.info("AuthService:: checking Connections for requesteeIds = ", requesteeIdsForConnectionCheck);

    // check 7. validate connection between requester and requestee
    const connectionType = [Constants.CONNECTION_TYPE_FRIEND, Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
    const connectionStatus = [Constants.ACTIVE];
    authResponse.authorizedConnections = await AuthService.getConnections(requesteeIdsForConnectionCheck, requesterId, connectionType, connectionStatus);

    log.info("Exiting AuthService :: authorizeMultipleConnectionsBasedSharingRules, authResponse = ", authResponse);
    return authResponse;
  }

  /**
   * Validate authorizePolicyBased rules between loggedin user and requested user
   *
   * @static
   * @param {string} requesterId
   * @param {string[]} requesteeIds
   * @param {string} resourceType
   * @param {string} accessType
   * @returns 1) [] is returned for admin user, when requester is self, their own subject references or if resource is set public.
   * This indicates full access for all the requested subjects. Sharing rules check not required.
   * 2) returns the list of Connections for when at least one was found between the requested
   * 3) if no connections found then throws error
   * @memberof AuthService
   */
  public static async authorizePolicyBased(
    requesterId: string,
    resourceActions: string[],
    resourceScope: string[],
    resourceType?: string,
    accessType?: string
  ) {
    const authResponse = {
      fullAuthGranted: true,
      authorizedResourceScopes: []
    };
    log.info("Entering AuthService :: authorizePolicyBased()");
    // 1 - Check loggedin user
    const fetchedProfiles = await DataFetch.getUserProfile([requesterId]);

    // check 2: if requester should be system user then allow access
    if (fetchedProfiles[requesterId] && fetchedProfiles[requesterId].profileType.toLowerCase() === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, Requester is system user :: authorizeMultipleConnectionsBasedSharingRules");
      return authResponse;
    }

    // check 3. If resourceType publicly accessible, then no connection check required
    const isPublicResource: boolean = await AuthService.getResourceAccessLevel(resourceType, accessType);
    if (isPublicResource) {
      log.info("Exiting AuthService, Resource type is public :: authorizeConnectionBasedSharingRules()");
      return authResponse;
    }
    // if we are here means full auth was not granted. Determining the partial Auth
    authResponse.fullAuthGranted = false;

    // check 3: study/site based access control can only be determined if the owner is ResearchSubject
    // TODO: maybe we should not limit policy based access check based on presence of subject reference.
    // TODO: invoke policyManger.requestResourceScopedAccess if subject is not there but resource is provided
    // This is okay only if this function is only called from clinical resource perspective.
    // if we use requesteeIds the UserProfile for these subjects may not be valid
    const resourceAccessResponse: ResourceAccessResponse = await PolicyManager.requestResourceScopedAccess({
      requesterReference: Constants.USERPROFILE_REFERENCE + requesterId,
      scopedResources: resourceScope,
      resourceActions
    });
    if (resourceAccessResponse.grantedPolicies && resourceAccessResponse.grantedPolicies.length > 0) {
      log.info("Access granted for resource =", resourceAccessResponse.grantedResources);
      authResponse.authorizedResourceScopes = authResponse.authorizedResourceScopes.concat(resourceAccessResponse.grantedResources);
    }

    log.info("Exiting AuthService :: authorizeMultipleConnectionsBasedSharingRules, authResponse = ", authResponse);
    return authResponse;
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
   * if own profile reference is present in requested list, add it to the return
   * if ResearchSubject references are provided check which of them belong to the logged in user (should not be deleted),
   * add them them to the return
   *
   * @static
   * @param {string} requesterProfileId loggedin user Id
   * @param {string[]} requestedProfiles requested search profiles
   * @param {*} accessType service access type
   * @returns
   * @memberof AuthService
   */
  public static async getRequesterOwnedReferences(requesterProfileId: string, requestedProfiles: string[], accessType) {
    let selfOwnedReferences = [];

    const uniqueSubjectReferences = ReferenceUtility.getUniqueReferences(requestedProfiles, Constants.RESEARCHSUBJECT_REFERENCE);

    // making sure the provided id is converted to Reference
    const requesterProfileReference = ReferenceUtility.convertToResourceReference(requesterProfileId, Constants.USERPROFILE_REFERENCE);

    if (uniqueSubjectReferences.length) {
      const individualReference = [Constants.DEFAULT_SEARCH_ATTRIBUTES, Constants.INDIVIDUAL_REFERENCE_KEY].join(Constants.DOT_VALUE);
      // lookup all subjects against the requester's UserProfile
      let whereClause = {
        [Constants.ID]: ReferenceUtility.convertToResourceIds(uniqueSubjectReferences, Constants.RESEARCHSUBJECT_REFERENCE),
        [individualReference]: requesterProfileReference,
        [Constants.META_IS_DELETED_KEY]: false
      };
      const criteria = this.getResearchSubjectFilterCriteria(accessType);
      if (criteria) {
        whereClause = Object.assign(whereClause, criteria);
      }
      const subjectResources = await DAOService.search(ResearchSubject, { where: whereClause });
      const subjectIds = _.map(subjectResources, Constants.ID).filter(Boolean);
      // convert IDs to references
      selfOwnedReferences = ReferenceUtility.convertToResourceReferences(subjectIds, Constants.RESEARCHSUBJECT_REFERENCE);
    }

    // if the self profile reference is present in requested list, keep it else we dont assume the requester wants his own data
    if (requestedProfiles.indexOf(requesterProfileReference) > -1) {
      selfOwnedReferences.push(requesterProfileReference);
    }
    return selfOwnedReferences;
  }

  /**
   * Validate policy and connection sharing rules between loggedin user and requested profiles
   *
   * @static
   * @param {string} requesterId
   * @param {string[]} requesteeIds
   * @param {string} resourceType
   * @param {string} accessType
   * @returns 1) [] is returned for admin user, when requester is self, their own subject references or if resource is set public.
   * This indicates full access for all the requested subjects. Sharing rules check not required.
   * 2) returns the list of Connections for when at least one was found between the requested
   * 3) if no connections found then throws error
   * @memberof AuthService
   */
  public static async authorizeMultipleOwnerBased(
    requesterId: string,
    requesteeIds: string[],
    resourceType: string,
    accessType: string,
    resourceActions?: string[]
  ) {
    const authResponse = {
      fullAuthGranted: true,
      authorizedConnections: [],
      authorizedRequestees: [],
      subjectToProfileMap: {}
    };
    log.info("Entering AuthService :: authorizeMultipleOwnerBased()");
    // 1 - Check loggedin user
    const fetchedProfiles = await DataFetch.getUserProfile([requesterId]);

    // check 2: if requester should be system user then allow access
    if (fetchedProfiles[requesterId] && fetchedProfiles[requesterId].profileType.toLowerCase() === Constants.SYSTEM_USER) {
      log.info("Exiting AuthService, Requester is system user :: authorizeMultipleOwnerBased");
      await this.validateProfileReferences(requesteeIds, accessType);
      return authResponse;
    }

    // check 3. If resourceType publicly accessible, then no connection check required
    const isPublicResource: boolean = await AuthService.getResourceAccessLevel(resourceType, accessType);
    if (isPublicResource) {
      await this.validateProfileReferences(requesteeIds, accessType);
      log.info("Exiting AuthService, Resource type is public :: authorizeConnectionBasedSharingRules()");
      return authResponse;
    }

    // check 4. if requester and requestee are the same users then allow access
    if (requesteeIds && requesteeIds.length == 1 && requesteeIds[0].split(Constants.FORWARD_SLASH)[1] == requesterId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: authorizeMultipleOwnerBased");
      return authResponse;
    }

    const researchSubjectCriteria = this.getResearchSubjectFilterCriteria(accessType);
    // FIXME: identify subjects with valid profiles and only used those for Policy check
    const subjectToProfileMap = await AuthService.validateProfiles(requesteeIds, researchSubjectCriteria);
    const validRequesteeIds = Object.keys(subjectToProfileMap);
    authResponse.subjectToProfileMap = subjectToProfileMap;

    // check 5. if requester accessing his own ResearchSubject then allow access
    if (validRequesteeIds.length == 1 && validRequesteeIds[0] == requesterId) {
      log.info("Exiting AuthService, requester and requestee are same profiles and are valid and active :: authorizeMultipleOwnerBased");
      return authResponse;
    }
    log.info("AuthService:: validRequesteeIds = ", validRequesteeIds);

    // if we are here means full auth was not granted. Determining the partial Auth
    authResponse.fullAuthGranted = false;

    // check 6. check if any references belong to the owner, no need to check policies for them
    let uniqReferences: any = Object.values(subjectToProfileMap);
    uniqReferences = [...new Set(uniqReferences.flat())];
    const requesterOwnedReferences = await AuthService.getRequesterOwnedReferences(requesterId, uniqReferences, Constants.ACCESS_READ);
    log.info("AuthService:: requesterOwnedReferences = ", requesterOwnedReferences);
    if (requesterOwnedReferences.length >= 1) {
      authResponse.authorizedRequestees = requesterOwnedReferences;
      return authResponse;
    }
    // remove authorizedResearchSubjects
    uniqReferences = ReferenceUtility.removeReferences(uniqReferences, requesterOwnedReferences);

    // check 7. study/site based access control can only be determined if the owner is ResearchSubject
    // TODO: maybe we should not limit policy based access check based on presence of subject reference.
    // TODO: invoke policyManger.requestResourceScopedAccess if subject is not there but resource is provided
    // This is okay only if this function is only called from clinical resource perspective.
    // if we use requesteeIds the UserProfile for these subjects may not be valid
    let requesteeIdsForConnectionCheck: string[] = [];
    const uniqueSubjectReferences = ReferenceUtility.getUniqueReferences(uniqReferences, Constants.RESEARCHSUBJECT_REFERENCE);
    log.info("AuthService:: uniqueSubjectReferences = ", uniqueSubjectReferences);
    // let allowedSubjects: string[] = null;
    if (uniqueSubjectReferences.length > 0 && resourceActions) {
      log.info("AuthService::authorizeMultipleOwnerBased() Owner is ResearchSubject, checking for policy based access.");
      const accessRequest: SubjectAccessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + requesterId,
        subjectReferences: uniqueSubjectReferences,
        resourceActions
      };
      const grantedPolicies: Map<string, PolicyDataResource[]> = await PolicyManager.requestSubjectScopedAccess(accessRequest);
      if (grantedPolicies && grantedPolicies.size > 0) {
        log.info("AuthService:: Policy based access was granted to some or all of the subjects.)");
        const accessGrantedSubjects = Array.from(grantedPolicies.keys());
        log.info("AuthService:: accessGrantedSubjects = ", accessGrantedSubjects);
        authResponse.authorizedRequestees = authResponse.authorizedRequestees.concat(accessGrantedSubjects);
      } else {
        log.info("AuthService:: Policy based access was not granted, checking for connection based access.");
      }
      // filter ResearchSubjects who has policy access granted
      for (const subjectToProfileMapKey in authResponse.subjectToProfileMap) {
        // get the value array for key. Here key is userProfile reference and values array contains researchSubject references or user profile references
        const profileValues: any[] = authResponse.subjectToProfileMap[subjectToProfileMapKey];
        // check if authorizedRequestee is present in profileValues
        const isProfileValueAuthorized = authResponse.authorizedRequestees.some((authorizedRequestee) => profileValues.indexOf(authorizedRequestee) >= 0);
        // if authorizedRequestee not present in profileValues then we need to validate the researchSubject's profile for connection check
        if (!isProfileValueAuthorized) {
          requesteeIdsForConnectionCheck.push(subjectToProfileMapKey);
        }
      }
    } else {
      requesteeIdsForConnectionCheck = uniqReferences;
      log.info("AuthService:: Owner is not ResearchSubject or resourceAction was not provided. Skipping to check Connection based access.");
    }
    if (requesteeIdsForConnectionCheck.length > 0) {
      log.info("AuthService:: checking Connections for requesteeIds = ", requesteeIdsForConnectionCheck);
      // check 8. validate connection between requester and requestee
      const connectionType = [Constants.CONNECTION_TYPE_FRIEND, Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
      const connectionStatus = [Constants.ACTIVE];
      authResponse.authorizedConnections = await AuthService.getConnections(requesteeIdsForConnectionCheck, requesterId, connectionType, connectionStatus);
      log.info("Exiting AuthService :: authorizeMultipleOwnerBased, authResponse = ", authResponse);
    }
    return authResponse;
  }

  /**
   * authorize scope based and subject profiles
   *
   * @static
   * @param {string} requesterId
   * @param {string} resourceType
   * @param {string} accessType
   * @param {Map<string, string[]>} resourceScopeMap
   * @param {string[]} subjectReferences
   * @param {string[]} resourceActions
   * @returns 1) authResponse is returned for successful authorization.
   * 2) if authorization fails then throws error
   * @memberOf AuthService
   */
  public static async authorizePolicyManagerBased(
    requesterId: string,
    resourceType: string,
    accessType: string,
    resourceScopeMap?: Map<string, string[]>,
    subjectReferences?: string[],
    resourceActions?: string[]
  ) {
    log.info("Entering AuthService :: authorizePolicyManagerBased()");
    let authResponse;
    // check if scope map is present to determine policy authorization flow
    if (resourceScopeMap && resourceScopeMap.size > 0) {
      let resourceScope: string[] = [];
      // concatenating all resources in the map values
      Array.from(resourceScopeMap.values()).forEach((scope: string[]) => {
        resourceScope = resourceScope.concat(scope);
      });
      log.info("Authorizing authorizePolicyBased :: authorizePolicyManagerBased()");
      authResponse = await AuthService.authorizePolicyBased(requesterId, resourceActions, resourceScope, resourceType, accessType);
      if (!authResponse.fullAuthGranted) {
        if (_.isEmpty(authResponse.authorizedResourceScopes) || authResponse.authorizedResourceScopes.length != resourceScope.length) {
          log.info("fullAuthGranted was not granted, authorizedResourceScopes are empty, This means you have no access to post this resource.");
          throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
        }
      }
      log.info("fullAuthGranted is granted, authorizedResourceScopes are not empty, This means you have scope access to get this resource.");
    }
    // if authGranted is false and subject references are present then perform multiple owner based authorization
    if (subjectReferences && subjectReferences.length > 0) {
      log.info("Authorizing authorizeMultipleOwnerBased :: authorizePolicyManagerBased()");
      authResponse = await AuthService.authorizeMultipleOwnerBased(requesterId, subjectReferences, resourceType, accessType, resourceActions);
      if (!authResponse.fullAuthGranted) {
        const authRequesteesLength = !_.isEmpty(authResponse.authorizedRequestees) ? authResponse.authorizedRequestees.length : 0;
        const authConnectionsLength = !_.isEmpty(authResponse.authorizedConnections) ? authResponse.authorizedConnections.length : 0;
        if (subjectReferences.length != authRequesteesLength + authConnectionsLength) {
          log.info(
            "fullAuthGranted was not granted, authorizedRequestees are empty or authorizedConnections are empty, This means you have no access to this resource."
          );
          throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
        }
      }
    }
    log.info("Exiting AuthService :: authorizePolicyManagerBased()");
    return authResponse;
  }
}
