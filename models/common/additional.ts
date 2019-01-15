import { Coding } from "./coding";

/**
 *
 */
class Additional {
  name?: string;
  type?: string;
  valueInteger?: number;
  valueDecimal?: number;
  valueDate?: string;
  valueTime?: string;
  valueString?: string;
  valueCoding?: Coding;
  items?: Additional[];
}

export { Additional };
