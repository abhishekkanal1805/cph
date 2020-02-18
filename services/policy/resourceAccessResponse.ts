/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { PolicyDataResource } from "../../models/CPH/policy/policyDataResource";

interface ResourceAccessResponse {
  /**
   * These are policies that were granted to the scopedResources
   */
  grantedPolicies: PolicyDataResource[];
  /**
   * This is copied from the request. Specifies which resources were looked up to  PolicyAssignment for the requester
   */
  grantedResources: string[];
  /**
   * This value will be simply returned back in the response so we can track/indicate which  which resource are we trying
   * to determine access for if it is other than the scoped resource. If not provided nothing will be returned.
   */
  requestToken?: string;
}

export { ResourceAccessResponse };
