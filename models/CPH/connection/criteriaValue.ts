import { CriteriaExpression } from "./criteriaExpression";

interface CriteriaValue {
  field: string;
  operation: string;
  value: string;
  type: string;
  criteria: Array<CriteriaValue | CriteriaExpression>;
}
export { CriteriaValue };
