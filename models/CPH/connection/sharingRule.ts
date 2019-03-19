import { CriteriaExpression } from "./criteriaExpression";
import { CriteriaValue } from "./criteriaValue";
interface SharingRule {
  linkId: number;
  name: string;
  description: string;
  resourceType: string;
  accessLevel: string;
  criteria: Array<CriteriaValue | CriteriaExpression>;
  criteriaLogic: string;
}
export { SharingRule };
