/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Coding } from "../../common/coding";
import { Quantity } from "../elements/quantity";

/**
 * This EnableWhen is specific to user profile.
 * TODO: there is one in questionnaire but has different fields, can we merge them both?
 */
class EnableWhen {
  itemId: string;
  hasAnswer?: boolean;
  answerBoolean?: boolean;
  answerDecimal?: number;
  answerDate?: string;
  answerDateTime?: string;
  answerString?: string;
  answerUri?: string;
  answerCoding?: Coding;
  answerQuantity?: Quantity;
}

export { EnableWhen };
