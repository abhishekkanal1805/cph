/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import {Column, DataType, Model, Table} from "sequelize-typescript";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { PolicyDataResource } from "./policyDataResource";

@Table({ tableName: "Policy" })
class Policy extends Model<Policy> {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false})
  name: string;

  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;

  @Column({ type: DataType.JSONB })
  dataResource: PolicyDataResource;
}

export { Policy };
