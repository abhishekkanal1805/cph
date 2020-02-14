/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { PolicyAssignmentDataResource } from "../../models/CPH/policy/policyAssignmentDataResource";
import { PolicyDataResource } from "../../models/CPH/policy/policyDataResource";
import { ResearchSubjectDataResource } from "../../models/CPH/researchSubject/researchSubjectDataResource";
import { PolicyAssignmentDAO } from "../dao/policyAssignmentDAO";
import { PolicyDAO } from "../dao/policyDAO";
import { ResearchSubjectDAO } from "../dao/researchSubjectDAO";
import { ResourceAccessRequest } from "./resourceAccessRequest";
import { SubjectAccessRequest } from "./subjectAccessRequest";

class PolicyManager {
  /**
   * The function determines whether the requester has access to perform the specified action by the invoked resource handler.
   * The owner or the study site scope is derived by fetching the ResearchSubject for subjectReference and
   * then referring its studyReference and siteReference.
   * The Request can be used only for determining access to one subject.
   * PolicyAssignments will be looked up for the requester with the scope of provided resources.
   * We will then search in the all the assigned/applicable policies whether the provided action is permitted.
   * @param {SubjectAccessRequest} accessRequest
   * @returns Map<string, PolicyDataResource[]> map of subject references and what policies were granted to it
   */
  public static async requestSubjectScopedAccess(accessRequest: SubjectAccessRequest): Promise<Map<string, PolicyDataResource[]>> {
    // if we are here we can assume that we are trying to determine access based on study/site/subject
    // subject reference if present is assumed to be valid
    log.info("PolicyManager - requestAccess for =" + JSON.stringify(accessRequest));
    // should the DAO look at the period for this subject before returning
    const searchResult: ResearchSubjectDataResource[] = await ResearchSubjectDAO.getByReferences(accessRequest.subjectReferences);

    if (!searchResult || searchResult.length < 1) {
      log.info("PolicyManager - subject references was not found. policy based access cannot be determined.");
      return null;
    }
    const policyGrants = new Map<string, PolicyDataResource[]>();
    // FIXME: can we adjust the policyDAO and assignmentDAO to lookup for multiple subjects together
    for (const researchSubject of searchResult) {
      if (researchSubject) {
        const resourcesAccessed = [researchSubject.study.reference];
        // site reference is optional so handling that
        if (researchSubject.site && researchSubject.site.reference) {
          resourcesAccessed.push(researchSubject.site.reference);
        }
        // QUESTION: should we make sure if site is present then it belong to the same study?
        // TODO: we can call this only once outside of the for-loop?
        const subjectPolicies = await PolicyManager.requestResourceScopedAccess({
          requesterReference: accessRequest.requesterReference,
          scopedResources: resourcesAccessed,
          resourceActions: accessRequest.resourceActions
        });
        if (subjectPolicies && subjectPolicies.length > 0) {
          log.info("Access granted for researchSubject=" + researchSubject.id);
          policyGrants.set(Constants.RESEARCHSUBJECT_REFERENCE + researchSubject.id, subjectPolicies);
        }
      }
    }
    log.info("Granted policies=" + JSON.stringify(policyGrants));
    return policyGrants;
  }

  /**
   * The function determines whether the requester has access to perform the specified action by the invoked resource handler.
   * PolicyAssignments will be looked up for the requester with the scope of provided resources.
   * We will then search in the all the assigned/applicable policies whether the provided action is permitted.
   * TODO: determine what will be returned. maybe return the policy that grants access
   * @param {ResourceAccessRequest} accessRequest
   */
  public static async requestResourceScopedAccess(accessRequest: ResourceAccessRequest) {
    if (!accessRequest.scopedResources || accessRequest.scopedResources.length < 1) {
      log.info("PolicyManager - scopedResources not available. policy based access cannot be determined.");
      return null;
    }
    if (!accessRequest.resourceActions) {
      log.info("PolicyManager - resourceAction not available. policy based access cannot be determined.");
      return null;
    }
    // looking up policy assignments
    const grantedPolicyAssignments: PolicyAssignmentDataResource[] = await PolicyAssignmentDAO.findAll(
      accessRequest.requesterReference,
      accessRequest.scopedResources
    );
    const grantedPolicyReferences: string[] = grantedPolicyAssignments.map((policyAssignment) => policyAssignment.policy.reference);
    // looking up policy
    return PolicyDAO.findAll(grantedPolicyReferences, accessRequest.resourceActions);
    // TODO: return a grant object to specify all the resources requester has access to. This might be useful in filtering search results
    // for this to work maybe we will need a join
  }
}

export { PolicyManager };
