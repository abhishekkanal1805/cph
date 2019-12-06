/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Extension } from "./extension";

class Coding {
  version: string;
  userSelected: boolean;
  system: string;
  code: string;
  display: string;
  /* Extensions */
  _display?: Extension;
}
export { Coding };
