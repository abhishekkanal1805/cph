import { Period } from "./period";

/**
 * An address expressed using postal conventions (as opposed to GPS or other location definition formats)
 * Elements defined in Ancestors: id, extension
 */
class Address {
  /**
   * home | work | temp | old - purpose of this address
   */
  use?: string;

  /**
   * postal | physical | both
   */
  type?: string;

  /**
   * Text representation of the address
   */
  text: string;

  /**
   * Street name, number, direction & P.O. Box etc.
   * This repeating element order: The order in which lines should appear in an address label
   */
  line?: string[];

  /**
   * Name of city, town etc.
   */
  city?: string;

  /**
   * District name (aka county)
   */
  district?: string;

  /**
   * Sub-unit of country (abbreviations ok)
   */
  state?: string;

  /**
   * Postal code for area
   */
  postalCode?: string;

  /**
   * Country (e.g. can be ISO 3166 2 or 3 letter code)
   */
  country?: string;

  /**
   * Time period when address was/is in use
   */
  period?: Period;

}

export { Address };
