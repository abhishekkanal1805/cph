/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Period } from "./period";

/**
 * A name of a human with text, parts and usage information.
 * Names may be changed or repudiated. People may have different names in different contexts.
 * Names may be divided into parts of different type that have variable significance depending on context,
 * though the division into parts is not always significant.
 * With personal names, the different parts may or may not be imbued with some implicit meaning;
 * various cultures associate different importance with the name parts and the degree to which systems
 * SHALL care about name parts around the world varies widely.
 * https://www.hl7.org/fhir/datatypes.html#humanname
 */
class HumanName {
  /**
   * Text representation of the full name
   */
  text?: string;

  /**
   * Family name (often called 'Surname')
   */
  family?: string;

  /**
   * Given names (not always 'first'). Includes middle names
   * This repeating element order: Given Names appear in the correct order for presenting the name
   */
  given?: string[];

  /**
   * Parts that come before the name
   * This repeating element order: Prefixes appear in the correct order for presenting the name
   */
  prefix?: string[];

  /**
   * Parts that come after the name
   * This repeating element order: Suffixes appear in the correct order for presenting the name
   */
  suffix?: string[];

  /**
   * Time period when name was/is in use
   */
  period?: Period;
}

export { HumanName };
