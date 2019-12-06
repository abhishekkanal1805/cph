/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Additional } from "../../common/additional";
import { Address } from "../../common/address";
import { CodeableConcept } from "../../common/codeableConcept";
import { ContactPoint } from "../../common/contactPoint";
import { HumanName } from "../../common/humanName";
import { Identifier } from "../../common/identifier";
import { Preference } from "../../common/preference";
import { ResourceMetadata } from "../../common/resourceMetadata";

class UserProfileDataResource {
  id: string;
  meta: ResourceMetadata;
  resourceType: string;
  email: string;
  name: HumanName;
  race: string;
  ethnicity: string;
  gender: string;
  birthDate: string;
  status: string;
  type: string;
  telecom: ContactPoint[];
  address: Address;
  preferences: Preference;
  identifier: Identifier;
  additionalAttributes: Additional[];
  locale: CodeableConcept;
  currentTimeZone: CodeableConcept;
  defaultTimeZone: CodeableConcept;
}

export { UserProfileDataResource };
