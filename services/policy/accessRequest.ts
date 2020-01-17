/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

/**
 * Request to access any resource based on requester's policy assignments
 */
interface AccessRequest {
    /**
     * UserProfile reference of the logged in user
     */
    requestorReference: string;
    /**
     * these are the resource references a policy needs to be associated with to determine whether the requester has access
     */
   resourceReferences?: string[];
    /**
     * a keyword that identifies which service:method or the handler is being access by the requester.
     * this keyword will be compare to a policyAction in Policy
     */
    resourceAction: string;
}
export {AccessRequest};
