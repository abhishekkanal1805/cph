/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Column, DataType, Model, Table } from "sequelize-typescript";
import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { ConnectionDataResource } from "./connectionDataResource";

@Table({ tableName: "Connection" })
class Connection extends Model<Connection> {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;
  @Column({ type: DataType.STRING, defaultValue: null })
  resourceType: string;
  @Column({ type: DataType.JSONB, defaultValue: null })
  from: Reference;
  @Column({ type: DataType.STRING, defaultValue: null })
  type: string;
  @Column({ type: DataType.STRING, defaultValue: null })
  status: string;
  @Column({ type: DataType.STRING, defaultValue: null })
  requestExpirationDate: string;
  @Column({ type: DataType.JSONB, defaultValue: null })
  to: Reference;
  @Column({ type: DataType.STRING, defaultValue: null })
  lastStatusChangeDateTime: string;
  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;
  @Column({ type: DataType.JSONB })
  dataResource: ConnectionDataResource;
}

export { Connection };
