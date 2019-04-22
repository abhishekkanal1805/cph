import { CriteriaValue } from "./criteriaValue";

interface CriteriaExpression {
  field: string;
  operation: string;
  valueExpression: string;
  type: string;
  criteria: Array<CriteriaValue | CriteriaExpression>;
}
export { CriteriaExpression };
