import { Address } from "../../common/address";
import { ContactPoint } from "../../common/contactPoint";
import { HumanName } from "../../common/humanName";
import { Identifier } from "../../common/identifier";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { ProfileItem } from "./profileItem";

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
  preferences: ProfileItem[];
  identifier: Identifier;
  userCode: string;
  npi: string;
  dea: string;
  additionalAttributes: ProfileItem[];
}

export { UserProfileDataResource };
