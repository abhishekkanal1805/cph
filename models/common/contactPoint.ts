/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Extension } from "./extension";
import { Period } from "./period";

/**
 * Details for all kinds of technology-mediated contact points for a person or organization,
 *  including telephone, email, etc.
 * https://www.hl7.org/fhir/datatypes.html#contactpoint
 */
class ContactPoint {
  /**
   * phone | fax | email | pager | url | sms | other
   * this is a required field
   */
  system?: string;

  /**
   * The actual contact point details
   */
  value?: string;

  /**
   * home | work | temp | old | mobile - purpose of this contact point
   * this is a required field
   */
  use?: string;

  /**
   * Specify preferred order of use (1 = highest)
   */
  rank?: number;

  /**
   * Time period when the contact point was/is in use
   */
  period?: Period;

  /* Extensions */
  _value?: Extension;
}

export { ContactPoint };
