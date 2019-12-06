/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Identifier } from "../../common/identifier";
import { Period } from "../../common/period";
import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
class ResearchSubjectDataResource {
  id: string;
  identifier?: Identifier[];
  status: string;
  period?: Period;
  study: Reference;
  studySite?: Reference;
  individual: Reference;
  assignedArm?: string;
  actualArm?: string;
  consent?: Reference;
  meta?: ResourceMetadata;
}
export { ResearchSubjectDataResource };
