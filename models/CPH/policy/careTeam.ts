/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { Subject } from "../../common/subject";
import { CareTeamDataResource } from "./careTeamDataResource";

@Table({ tableName: "CareTeam" })
export class CareTeam extends Model<CareTeam> {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING, defaultValue: null })
  status: string;

  @Column({ type: DataType.STRING, field: "subject", defaultValue: null })
  _subject: string;

  @Column({ type: DataType.JSONB })
  dataResource: CareTeamDataResource;

  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;

  set subject(value: Subject) {
    this._subject = value.reference;
  }
}
