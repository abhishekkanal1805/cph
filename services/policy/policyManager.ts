/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import {PolicyAssignmentDataResource} from "../../models/CPH/policy/policyAssignmentDataResource";
import {ResearchSubjectDataResource} from "../../models/CPH/researchSubject/researchSubjectDataResource";
import {PolicyAssignmentDAO} from "../dao/policyAssignmentDAO";
import {PolicyDAO} from "../dao/policyDAO";
import {ResearchSubjectDAO} from "../dao/researchSubjectDAO";
import {SubjectAccessRequest} from "./subjectAccessRequest";

class PolicyManager {

    /**
     * The function determines whether the requester has access to perform the action determined the provided resourceHandler.
     * The owner or the study site scope is derived by fetching the ResearchSubject for subjectReference and
     * then referring its studyReference and siteReference.
     * The Request can be used only for determining access to one subject.
     * TODO: determine what will be returned. maybe return the policy that grants access
     * @param accessRequest
     */
    public static async requestSubjectAccess(accessRequest: SubjectAccessRequest) {
        // if we are here we can assume that we are trying to determine access based on study/site/subject
        // subject reference if present is assumed to be valid
        log.info("PolicyManager - requestAccess for =" + JSON.stringify(accessRequest));
        // should the DAO look at the period for this subject before returning
        const searchResult: ResearchSubjectDataResource[] = await ResearchSubjectDAO.getByReferences([accessRequest.subjectReference]);

        let researchSubject: ResearchSubjectDataResource;
        if (searchResult && searchResult.length > 0) {
            researchSubject = searchResult[0];
        } else {
            log.info("PolicyManager - subject reference was not found. policy based access is denied.");
            return null;
        }
        if (!researchSubject) {
            log.info("PolicyManager - subject reference could was not found. policy based access is denied.");
            return null;
        }
        const resourcesAccessed = [researchSubject.study.reference, researchSubject.site.reference];

        // looking up policy assignments
        const grantedPolicyAssignments: PolicyAssignmentDataResource[] = await PolicyAssignmentDAO.findAll(accessRequest.requestorReference, resourcesAccessed);
        const grantedPolicyReferences: string[] = grantedPolicyAssignments.map((policyAssignment) => policyAssignment.policy.reference);
        // looking up policy
        return await PolicyDAO.findAll(grantedPolicyReferences, accessRequest.resourceAction);
        // TODO: return a grant object to specify all the resources requester has access to. This might be useful in filtering search results
        // for this to work maybe we will need a join
    }

}

export { PolicyManager };
