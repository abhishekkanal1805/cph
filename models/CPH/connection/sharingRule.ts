import { CriteriaList } from "./criteriaList";

interface SharingRule {
  name: string;
  description: string;
  accessLevel: string;
  resourceType: string;
  criteriaList: CriteriaList;
}
export { SharingRule };
