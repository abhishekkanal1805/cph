/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { ResourceMetadata } from "../../common/resourceMetadata";

class PolicyDataResource {
  id: string;
  status: string;
  name: string;
  description: string;
  effect: string;
  action: string[];
  resourceType: string;
  meta: ResourceMetadata;
}

export { PolicyDataResource };
