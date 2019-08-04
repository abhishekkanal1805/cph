import { Coding } from "./coding";

interface CodeableConcept {
  text: string;
  coding: Coding[];
  /* Extensions */
  _text?: string;
}
export { CodeableConcept };
