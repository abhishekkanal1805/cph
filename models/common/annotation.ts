/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Reference } from "./reference";

class Annotation {
  authorReference?: Reference;
  authorString?: string;
  text: string;
  time?: string;
}

export { Annotation };
