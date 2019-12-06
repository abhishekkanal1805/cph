/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Coding } from "../../common/coding";
import { Quantity } from "../../common/quantity";

/**
 * This is user profile specific answer.
 * TODO: There is answer type in CPH/elements that has additional attributes, can we merge the two?
 */
class Answer {
  valueBoolean?: boolean;
  valueDecimal?: number;
  valueInteger?: number;
  valueDate?: string;
  valueDateTime?: string;
  valueTime?: string;
  valueString?: string;
  valueUri?: string;
  valueCoding?: Coding;
  valueQuantity?: Quantity;
}

export { Answer };
