/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { CriteriaExpression } from "./criteriaExpression";
import { CriteriaGroup } from "./criteriaGroup";
import { CriteriaValue } from "./criteriaValue";

interface SharingRule {
  name: string;
  description: string;
  accessLevel: string;
  resourceType: string;
  operator: string;
  criteria: Array<CriteriaGroup | CriteriaValue | CriteriaExpression>;
}
export { SharingRule };
