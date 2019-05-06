import { CriteriaExpression } from "./criteriaExpression";
import { CriteriaValue } from "./criteriaValue";

interface CriteriaGroup {
  type: string;
  operator: string;
  criteria: Array<CriteriaGroup | CriteriaValue | CriteriaExpression>;
}
export { CriteriaGroup };
