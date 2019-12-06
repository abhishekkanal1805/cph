/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ResourceMetadata } from "../../common/resourceMetadata";

@Table({ tableName: "OrganizationLevelDefaults" })
export class OrganizationLevelDefaults extends Model<OrganizationLevelDefaults> {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING, defaultValue: null })
  serviceName: string;

  @Column({ type: DataType.STRING, defaultValue: null })
  accessType: string;

  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;
}
