import {Coding} from "./coding";

/**
 * An address expressed using postal conventions (as opposed to GPS or other location definition formats)
 * Elements defined in Ancestors: id, extension
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
