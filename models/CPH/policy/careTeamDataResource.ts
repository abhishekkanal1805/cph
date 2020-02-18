/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { CodeableConcept } from "../../common/codeableConcept";
import { ContactPoint } from "../../common/contactPoint";
import { Identifier } from "../../common/identifier";
import { Period } from "../../common/period";
import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";

import { AuthorReferenceAnnotation } from "./authorReferenceAnnotation";
import { AuthorStringAnnotation } from "./authorStringAnnotation";
import { Participant } from "./participant";

class CareTeamDataResource {
  id: string;
  resourceType: string;
  identifier?: Identifier[];
  status?: string;
  category?: CodeableConcept[];
  name?: string;
  subject?: Reference;
  study?: Reference;
  site?: Reference;
  period?: Period;
  participant?: Participant[];
  reasonCode?: CodeableConcept[];
  reasonReference?: Reference[];
  telecom?: ContactPoint[];
  note?: AuthorReferenceAnnotation[] | AuthorStringAnnotation[];
  meta: ResourceMetadata;
}

export { CareTeamDataResource };
