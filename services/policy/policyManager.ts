/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { CareTeamDataResource } from "../../models/CPH/policy/careTeamDataResource";
import { PolicyAssignmentDataResource } from "../../models/CPH/policy/policyAssignmentDataResource";
import { PolicyDataResource } from "../../models/CPH/policy/policyDataResource";
import { ResearchSubjectDataResource } from "../../models/CPH/researchSubject/researchSubjectDataResource";
import { CareTeamDAO } from "../dao/careTeamDAO";
import { PolicyAssignmentDAO } from "../dao/policyAssignmentDAO";
import { PolicyDAO } from "../dao/policyDAO";
import { ResearchSubjectDAO } from "../dao/researchSubjectDAO";
import { ReferenceUtility } from "../utilities/referenceUtility";
import { ResourceAccessRequest } from "./resourceAccessRequest";
import { ResourceAccessResponse } from "./resourceAccessResponse";
import { SubjectAccessRequest } from "./subjectAccessRequest";

class PolicyManager {
  /**
   * The function determines whether the requester has access to perform the specified action by the invoked resource handler.
   * The owner or the study site scope is derived by fetching the ResearchSubject for subjectReference and
   * then referring its studyReference and siteReference.
   * The Request can be used only for determining access to one subject.
   * PolicyAssignments will be looked up for the requester with the scope of provided resources.
   * We will then search in the all the assigned/applicable policies whether the provided action is permitted.
   * TODO: can we combine policyDAO and assignmentDAO lookup?
   * @param {SubjectAccessRequest} accessRequest
   * @returns Map<string, PolicyDataResource[]> map of subject references and what policies were granted to it
   */
  public static async requestSubjectScopedAccess(accessRequest: SubjectAccessRequest): Promise<Map<string, PolicyDataResource[]>> {
    // if we are here we can assume that we are trying to determine access based on study/site/subject
    // subject reference if present is assumed to be valid
    log.info("PolicyManager - requestAccess for =", accessRequest);
    // initializing the return Map
    const policyGrants = new Map<string, PolicyDataResource[]>();
    // should the DAO look at the period for this subject before returning
    const researchSubjectDataResources: ResearchSubjectDataResource[] = await ResearchSubjectDAO.getByReferences(accessRequest.subjectReferences);

    if (!researchSubjectDataResources || researchSubjectDataResources.length < 1) {
      log.info("PolicyManager - subject references was not found. policy based access cannot be determined.");
      return policyGrants;
    }

    const allPromises: Array<Promise<ResourceAccessResponse>> = [];
    for (const researchSubject of researchSubjectDataResources) {
      if (researchSubject) {
        const resourcesAccessed = [researchSubject.study.reference];
        // site reference is optional so handling that
        if (researchSubject.site && researchSubject.site.reference) {
          resourcesAccessed.push(researchSubject.site.reference);
        }
        // QUESTION: should we make sure if site is present then it belong to the same study?
        const subjectPoliciesPromise = PolicyManager.requestResourceScopedAccess({
          requesterReference: accessRequest.requesterReference,
          scopedResources: resourcesAccessed,
          resourceActions: accessRequest.resourceActions,
          requestToken: researchSubject.id
        });
        allPromises.push(subjectPoliciesPromise);
      }
    }

    await Promise.all(allPromises).then((resourceAccessResponses: ResourceAccessResponse[]) => {
      if (resourceAccessResponses && resourceAccessResponses.length > 0) {
        resourceAccessResponses.forEach((resourceAccessResponse) => {
          if (resourceAccessResponse.grantedPolicies && resourceAccessResponse.grantedPolicies.length > 0) {
            log.info("Access granted for researchSubject=" + resourceAccessResponse.requestToken);
            policyGrants.set(Constants.RESEARCHSUBJECT_REFERENCE + resourceAccessResponse.requestToken, resourceAccessResponse.grantedPolicies);
          }
        });
      }
    });

    return policyGrants;
  }

  /**
   * The function determines whether the requester has access to perform the specified action by the invoked resource handler.
   * PolicyAssignments will be looked up for the requester with the scope of provided resources.
   * We will then search in the all the assigned/applicable policies whether the provided action is permitted.
   * @param {ResourceAccessRequest} accessRequest
   */
  public static async requestResourceScopedAccess(accessRequest: ResourceAccessRequest): Promise<ResourceAccessResponse> {
    log.info("Inside PolicyManager :: requestResourceScopedAccess()");
    const resourceAccessResponse: ResourceAccessResponse = {
      grantedPolicies: [],
      grantedResources: [],
      requestToken: accessRequest.requestToken
    };

    if (!accessRequest.scopedResources || accessRequest.scopedResources.length < 1) {
      log.info("PolicyManager - scopedResources not available. policy based access cannot be determined.");
      return resourceAccessResponse;
    }
    if (!accessRequest.resourceActions) {
      log.info("PolicyManager - resourceAction not available. policy based access cannot be determined.");
      return resourceAccessResponse;
    }

    // looking up policy assignments
    const grantedPolicyAssignments: PolicyAssignmentDataResource[] = await PolicyAssignmentDAO.findAll(
      accessRequest.requesterReference,
      accessRequest.scopedResources
    );
    const grantedPolicyReferences: string[] = grantedPolicyAssignments.map((policyAssignment) => policyAssignment.policy.reference);
    // looking up policy
    const grantedPolices: PolicyDataResource[] = await PolicyDAO.findAll(grantedPolicyReferences, accessRequest.resourceActions);
    if (grantedPolices.length < 1) {
      return resourceAccessResponse;
    }
    // create an array of IDs from Policies
    const grantedPolicyIds: string[] = grantedPolices.map((grantedPolicy: PolicyDataResource) => grantedPolicy.id);
    // see which policyAssignments are actually available based on granted policies. for that assignment capture the resourceScope.resource.reference
    const grantedResources: string[] = [];
    grantedPolicyAssignments.forEach((grantedPolicyAssignment: PolicyAssignmentDataResource) => {
      const grantedPolicyId: string = ReferenceUtility.convertToResourceId(grantedPolicyAssignment.policy.reference, Constants.POLICY_REFERENCE);
      if (grantedPolicyIds.includes(grantedPolicyId)) {
        grantedResources.push(grantedPolicyAssignment.resourceScope.resource.reference);
      }
    });
    // 1. grantedResources equal ["Study/111", "Site/111", "Site/222", "Site/111"]
    log.info("grantedResources: " + grantedResources.length);
    if (grantedResources.length > 0) {
      const siteReferences: string[] = ReferenceUtility.getUniqueReferences(grantedResources, Constants.STUDY_SITE_REFERENCE);
      log.info("Site references: ", siteReferences);
      if (siteReferences.length > 0) {
        // check if care team is active and not expired, member is active and not expired for given member and site reference
        // siteReferences= ["Site/111", "Site/222"]
        const careTeams: CareTeamDataResource[] = await CareTeamDAO.findAll(accessRequest.requesterReference, siteReferences);
        if (!careTeams || careTeams.length < 1) {
          // if at this point the filtered scopedResource is empty, "return resourceAccessResponse". no need to check assignments and policies
          log.info("CareTeams are not present for sites = ", siteReferences);
          return resourceAccessResponse;
        }
        // careTeam[] to siteArray[]
        // allowed sites = ["Site/222"]
        // sitesToBeRemoved = siteReferences - allowedSite
        // option 1. grantedResources = grantedResources - sitesToBeRemoved, if we do this we could be keeping unrelated studies
        // option 2. grantedResources = allowedSite, if we do this we will remove any non site references from grantedResources
      }
      log.info("PolicyManager - CareTeam validation successful");
    }
    // filtered grantedResources equal ["Study/111", "Site/111", "Site/222", "Site/111"]
    // populating the response
    resourceAccessResponse.grantedPolicies = grantedPolices;
    resourceAccessResponse.grantedResources = [...new Set(grantedResources)];
    log.info("grantedResources = ", resourceAccessResponse.grantedResources);
    return resourceAccessResponse;
  }
}

export { PolicyManager };
