/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { CodeableConcept } from "./codeableConcept";
import { Period } from "./period";
import { Reference } from "./reference";

class Identifier {
  use?: string;

  type?: CodeableConcept;

  system?: string;

  value?: string;

  period?: Period;

  assigner?: Reference;
}

export { Identifier };
