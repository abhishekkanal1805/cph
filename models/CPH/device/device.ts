import { Column, DataType, Model, Table } from "sequelize-typescript";
import { Identifier } from "../../common/identifier";
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

  /**
   * Cognito device ID or the bundle ID, app identifier
   */
  @Column({ type: DataType.JSONB })
  identifier: Identifier[];

  @Column({ type: DataType.JSONB })
  platformToken: Identifier;

  @Column({ type: DataType.JSONB, allowNull: false })
  informationSource: InformationSource;

  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;

  @Column({ type: DataType.JSONB })
  dataResource: DeviceDataResource;
}
