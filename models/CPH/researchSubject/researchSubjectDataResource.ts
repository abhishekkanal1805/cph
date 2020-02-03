/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { CodeableConcept } from "../../common/codeableConcept";
import { Identifier } from "../../common/identifier";
import { Period } from "../../common/period";
import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { ResearchSubjectPreference } from "./researchSubjectPreference";
class ResearchSubjectDataResource {
  id: string;
  identifier?: Identifier[];
  status: string;
  statusReason: CodeableConcept;
  period?: Period;
  study: Reference;
  site?: Reference;
  individual: Reference;
  nameInitials: string;
  assignedArm?: string;
  actualArm?: string;
  consent?: Reference;
  preferences?: ResearchSubjectPreference;
  meta?: ResourceMetadata;
}
export { ResearchSubjectDataResource };
