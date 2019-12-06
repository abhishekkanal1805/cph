/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Option } from "../../common/option";
import { Answer } from "./answer";
import { EnableWhen } from "./enableWhen";

class ProfileItem {
  /**
   * unique id for item
   */
  itemId: string;

  /**
   * primary text for the item
   */
  text?: string;

  /**
   * set to true if item is not displayed to user.
   * default value should be set to false if not present
   */
  isInternal?: boolean;

  /**
   * group|singleChoice|multipleChoice|text
   */
  type?: string;

  option?: Option[];

  /**
   * required item for user input
   */
  required?: boolean;

  /**
   * No more than this many characters. Value is in Integer
   */
  maxLength?: number;

  enableWhen?: EnableWhen[];

  answer?: Answer[];

  profileItem?: ProfileItem[];
}

export { ProfileItem };
