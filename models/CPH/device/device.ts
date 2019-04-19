import { Column, DataType, Model, Table } from "sequelize-typescript";
import { InformationSource } from "../../common/informationSource";
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
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING, field: "informationSource" })
  _informationSource: string;

  @Column({ type: DataType.STRING })
  status: string;

  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;

  @Column({ type: DataType.JSONB })
  dataResource: DeviceDataResource;

  set informationSource(value: InformationSource) {
    this._informationSource = value.reference;
  }
}
