import { CodeableConcept } from "../../common/codeableConcept";
import { Identifier } from "../../common/identifier";

export class Version {
  type: CodeableConcept;

  value: string;

  component: Identifier;
}
