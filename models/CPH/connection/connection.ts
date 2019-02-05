import { Column, DataType, Model, Table } from "sequelize-typescript";
import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { ConnectionDataResource } from "./connectionDataResource";

@Table({ tableName: "Connection" })
class Connection extends Model<Connection> {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;
  @Column({ type: DataType.STRING })
  resourceType: string;
  @Column({ type: DataType.JSONB })
  from: Reference;
  @Column({ type: DataType.STRING })
  type: string;
  @Column({ type: DataType.STRING })
  status: string;
  @Column({ type: DataType.STRING })
  requestExpirationDate: string;
  @Column({ type: DataType.JSONB })
  to: Reference;
  @Column({ type: DataType.STRING })
  lastStatusChangeDateTime: string;
  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;
  @Column({ type: DataType.JSONB })
  dataResource: ConnectionDataResource;
}

export { Connection };
