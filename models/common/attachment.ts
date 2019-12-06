/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Extension } from "./extension";

interface Attachment {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: string;
  hash?: string;
  title?: string;
  creation?: string;
  /* Extensions */
  _title?: Extension;
}
export { Attachment };
