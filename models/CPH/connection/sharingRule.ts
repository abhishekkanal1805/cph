import { CriteriaExpression } from "./criteriaExpression";
import { CriteriaGroup } from "./criteriaGroup";
import { CriteriaValue } from "./criteriaValue";

interface SharingRule {
  name: string;
  description: string;
  accessLevel: string;
  resourceType: string;
  criteria: Array<CriteriaGroup | CriteriaValue | CriteriaExpression>;
}
export { SharingRule };
