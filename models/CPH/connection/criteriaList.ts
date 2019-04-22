import { CriteriaExpression } from "./criteriaExpression";
import { CriteriaValue } from "./criteriaValue";

interface CriteriaList {
  type: string;
  criteria: Array<CriteriaValue | CriteriaExpression>;
  criteriaList: CriteriaList;
}
export { CriteriaList };
