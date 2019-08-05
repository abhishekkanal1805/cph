import { ContactPoint } from "./contactPoint";
import { Extension } from "./extension";

export class ContactDetail {
  name?: string;
  telecom?: ContactPoint[];
  /* Extensions */
  _name?: Extension;
}
