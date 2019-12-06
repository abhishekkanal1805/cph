/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { CodeableConcept } from "./codeableConcept";
import { Range } from "./range";
import { SimpleQuantity } from "./simpleQuantity";

interface ReferenceRange {
  low?: SimpleQuantity;
  high?: SimpleQuantity;
  type?: CodeableConcept;
  appliesTo?: CodeableConcept[];
  age?: Range;
  text?: string;
}
export { ReferenceRange };
