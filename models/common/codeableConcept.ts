import { Coding } from "./coding";
import { Extension } from "./extension";

interface CodeableConcept {
  text: string;
  coding: Coding[];
  /* Extensions */
  _text?: Extension;
}
export { CodeableConcept };
