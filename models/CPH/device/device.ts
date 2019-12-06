/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Column, DataType, Model, Table } from "sequelize-typescript";
import { Constants } from "../../../common/constants/constants";
import { InformationSource } from "../../common/informationSource";
import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { DeviceDataResource } from "./deviceDataResource";

/**
 * Table design:
 * id = primaryKey
 * informationSource = not null, contains the userProfileId used for validation
 * platformToken = optional, contains the platform specific tokens used for device notifications
 * status = optional, information on whether this device is active, logged out etc
 * deviceInformation = not optional, contains information about device hardware and operating system
 */
@Table({ tableName: "Device" })
export class Device extends Model<Device> {
  static STATUS_ACTIVE = "active";

  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING, field: Constants.INFORMATION_SOURCE_ATTRIBUTE, defaultValue: null })
  _informationSource: string;

  @Column({ type: DataType.STRING, defaultValue: null })
  status: string;

  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;

  @Column({ type: DataType.JSONB })
  dataResource: DeviceDataResource;

  @Column({ type: DataType.STRING, field: Constants.USER_ATTRIBUTE, defaultValue: null })
  _user: string;

  set informationSource(value: InformationSource) {
    this._informationSource = value.reference;
  }

  set user(value: Reference) {
    this._user = value.reference;
  }
}
