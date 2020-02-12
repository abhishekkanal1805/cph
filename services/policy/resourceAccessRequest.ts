/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

/**
 * Request to access records by association with the provided resource based on requester's policy assignments
 */
interface ResourceAccessRequest {
  /**
   * reference of the requester. Generally will be the UserProfile reference of the logged in user
   */
  requesterReference: string;
  /**
   * will be used to lookup the PolicyAssignment for the requester
   */
  scopedResources: string[];
  /**
   * a keyword that identifies which service:method or the handler is being access by the requester.
   * this keyword will be compare to a policyAction in Policy
   */
  resourceAction: string;
}

export { ResourceAccessRequest };
