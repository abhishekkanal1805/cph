import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ResourceMetadata } from "../../common/resourceMetadata";

@Table({ tableName: "ServiceConfig" })
export class ServiceConfig extends Model<ServiceConfig> {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING, defaultValue: null })
  serviceName: string;

  @Column({ type: DataType.STRING, defaultValue: null })
  accessType: string;

  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;
}
