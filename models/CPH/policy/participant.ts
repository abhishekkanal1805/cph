/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { CodeableConcept } from "../../common/codeableConcept";
import { ContactPoint } from "../../common/contactPoint";
import { Period } from "../../common/period";
import { Reference } from "../../common/reference";

export class Participant {
  role?: CodeableConcept[];
  member?: Reference;
  telecom?: ContactPoint[];
  period?: Period;
  status: string;
}
