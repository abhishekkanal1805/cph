import { ValueExpression } from "./valueExpression";

interface CriteriaExpression {
  type: string;
  element: string;
  operation: string;
  valueExpression: ValueExpression;
}
export { CriteriaExpression };
