/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

/**
 * Request to access to the provided subject's resource based on requester's policy assignments
 */
interface SubjectAccessRequest {
    /**
     * UserProfile reference of the logged in user
     */
    requestorReference: string;
    /**
     * ResearchSubject reference of the subjects for determining ownership if it is clinical resource
     */
    subjectReference: string;
    /**
     * a keyword that identifies which service:method or the handler is being access by the requester.
     * this keyword will be compare to a policyAction in Policy
     */
    resourceAction: string;
}
export {SubjectAccessRequest};
