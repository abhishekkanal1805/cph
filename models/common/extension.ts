/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Address } from "./address";
import { Attachment } from "./attachment";
import { CodeableConcept } from "./codeableConcept";
import { Coding } from "./coding";
import { ContactDetail } from "./contactDetail";
import { ContactPoint } from "./contactPoint";
import { Duration } from "./duration";
import { HumanName } from "./humanName";
import { Identifier } from "./identifier";
import { Period } from "./period";
import { Quantity } from "./quantity";
import { Range } from "./range";
import { Ratio } from "./ratio";
import { Reference } from "./reference";
import { ResourceMetadata } from "./resourceMetadata";
import { SampleData } from "./sampleData";
import { SimpleQuantity } from "./simpleQuantity";

export interface LanguageExtension {
  url: string;
  valueCode?: string;
}

export interface ContentExtension {
  url: string;
  valueString: string;
}

/**
 * Every element in a resource or data type includes an optional "extension" child element that may be present any number of times.
 * This is the content model of the extension as it appears in each resource.
 * value[x] must be one of a constrained set of the data types defined here
 * https://www.hl7.org/fhir/extensibility.html
 */
export class Extension {
  url: string;
  id?: string;

  // primary types
  valueBoolean?: boolean;
  valueCode?: string;
  valueString?: string;
  /**
   * may contain markdown syntax for optional processing by a markdown presentation engine
   */
  valueMarkdown?: string;
  valueDecimal?: number;
  valueInteger?: number;
  valueDate?: string;
  valueDateTime?: string;
  valueTime?: string;
  valueUri?: string;
  valueUrl?: string;
  valueCanonical?: string;
  valueId?: string;
  valueUuid: string;
  valueBase64Binary?: string;

  // general-purpose/complex types
  // TODO: to add dosage and timing here, they have to be moved the base service first
  // TODO: make sure that all the below complex types are FHIR compatible
  valueAddress?: Address;
  valueAttachment?: Attachment;
  valueCodeableConcept?: CodeableConcept;
  valueCoding?: Coding;
  valueContactDetail?: ContactDetail;
  valueContactPoint?: ContactPoint;
  valueDuration?: Duration;
  valueHumanName?: HumanName;
  valueIdentifier?: Identifier;
  valuePeriod?: Period;
  valueQuantity?: Quantity;
  valueSimpleQuantity?: SimpleQuantity;
  valueSampleData?: SampleData;
  valueRange?: Range;
  valueRatio?: Ratio;
  valueReference?: Reference;
  valueMeta?: ResourceMetadata;

  extension?: Extension[];
}
