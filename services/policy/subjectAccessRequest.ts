/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

/**
 * Request to access to the provided subject's resource based on requester's policy assignments
 */
interface SubjectAccessRequest {
  /**
   * reference of the requester. Generally will be the UserProfile reference of the logged in user
   */
  requesterReference: string;
  /**
   * ResearchSubject references of the subjects for determining ownership if it is clinical resource
   */
  subjectReferences: string[];
  /**
   * a keyword that identifies which service:method or the handler is being access by the requester.
   * this keyword will be compare to a policyAction in Policy
   */
  resourceActions: string[];
}
export { SubjectAccessRequest };
