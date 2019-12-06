/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { BaseEntry } from "./baseEntry";

class BaseBundle {
  resourceType: string;
  total: number;
  entry: BaseEntry[];
}

export { BaseBundle };
