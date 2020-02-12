/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { ResourceScope } from "./resourceScope";

class PolicyAssignmentDataResource {
  id: string;
  principal: Reference;
  policy: Reference;
  resourceScope: ResourceScope;
  resourceType: string;
  meta: ResourceMetadata;
}

export { PolicyAssignmentDataResource };
