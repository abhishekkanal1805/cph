/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { CriteriaExpression } from "./criteriaExpression";
import { CriteriaValue } from "./criteriaValue";

interface CriteriaGroup {
  type: string;
  operator: string;
  criteria: Array<CriteriaGroup | CriteriaValue | CriteriaExpression>;
}
export { CriteriaGroup };
