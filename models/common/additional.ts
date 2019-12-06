/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Coding } from "./coding";

/**
 *
 */
class Additional {
  name?: string;
  type?: string;
  valueInteger?: number;
  valueDecimal?: number;
  valueDate?: string;
  valueTime?: string;
  valueString?: string;
  valueCoding?: Coding;
  valueBoolean?: boolean;
  items?: Additional[];
}

export { Additional };
