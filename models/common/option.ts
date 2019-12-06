/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Coding } from "./coding";
import { Extension } from "./extension";

export class Option {
  valueInteger?: number;
  valueDecimal?: number;
  valueDate?: string;
  valueTime?: string;
  valueString?: string;
  valueCoding?: Coding;
  /* Extensions */
  _valueString?: Extension;
}
