/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Column, DataType, Model, Table } from "sequelize-typescript";
import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { ResearchSubjectDataResource } from "./researchSubjectDataResource";

@Table({ tableName: "ResearchSubject" })
export class ResearchSubject extends Model<ResearchSubject> {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING })
  status: string;

  @Column({ type: DataType.STRING, field: "individual", defaultValue: null })
  _individual: string;

  @Column({ type: DataType.JSONB })
  meta?: ResourceMetadata;

  @Column({ type: DataType.JSONB })
  dataResource?: ResearchSubjectDataResource;

  set individual(value: Reference) {
    this._individual = value.reference;
  }
}
