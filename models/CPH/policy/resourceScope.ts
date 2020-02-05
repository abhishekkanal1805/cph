/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Reference } from "../../common/reference";

class ResourceScope {
  resource: Reference;
  include: string[];
  revInclude: string[];
}

export { ResourceScope };
