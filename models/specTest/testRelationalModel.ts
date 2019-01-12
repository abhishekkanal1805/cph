import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ResourceMetadata } from "../common/resourceMetadata";

@Table({ tableName: "TestRelational" })
export class TestRelationalModel extends Model<TestRelationalModel> {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING })
  deviceId: string;

  @Column({ type: DataType.STRING })
  userProfileId: string;

  @Column({ type: DataType.BOOLEAN })
  active: boolean;

  @Column({ type: DataType.STRING })
  resourceType: string;

  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;
}
