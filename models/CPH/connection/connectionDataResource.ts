/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { StringObject } from "../../common/stringObject";
import { SharingRule } from "./sharingRule";

class ConnectionDataResource {
  id: string;
  resourceType: string;
  from: Reference;
  type: string;
  status: string;
  requestExpirationDate: string;
  to: Reference;
  requestParameter: StringObject[];
  sharingRules: SharingRule[];
  lastStatusChangeDateTime: string;
  meta: ResourceMetadata;
}

export { ConnectionDataResource };
