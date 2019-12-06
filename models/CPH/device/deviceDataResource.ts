/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { CodeableConcept } from "../../common/codeableConcept";
import { Identifier } from "../../common/identifier";
import { InformationSource } from "../../common/informationSource";
import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { DeviceName } from "./deviceName";
import { Version } from "./version";

export class DeviceDataResource {
  id: string;
  resourceType: string;
  identifier: Identifier[];
  platformToken: Identifier;
  status: string;
  statusReason: CodeableConcept[];
  informationSource: InformationSource;
  user: Reference;
  manufacturer: string;
  manufactureDate: string;
  expirationDate: string;
  serialNumber: string;
  modelNumber: string;
  type: CodeableConcept;
  deviceName: DeviceName[];
  version: Version[];
  meta: ResourceMetadata;
}
