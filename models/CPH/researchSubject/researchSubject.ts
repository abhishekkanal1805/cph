import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ResourceCategory } from "../../../common/constants/resourceCategory";
import { Identifier } from "../../common/identifier";
import { Period } from "../../common/period";
import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { ResearchSubjectDataResource } from "./researchSubjectDataResource";

@Table({ tableName: "ResearchSubject" })
export class ResearchSubject extends Model<ResearchSubject> {
  static readonly resourceCategory: ResourceCategory = ResourceCategory.DEFINITION;

  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.JSONB, defaultValue: null })
  identifier?: Identifier[];

  @Column({ type: DataType.STRING })
  status: string;

  @Column({ type: DataType.JSONB, defaultValue: null })
  period?: Period;

  @Column({ type: DataType.JSONB })
  study: Reference;

  @Column({ type: DataType.JSONB })
  studySite?: Reference;

  @Column({ type: DataType.JSONB })
  individual: Reference;

  @Column({ type: DataType.JSONB })
  meta?: ResourceMetadata;

  @Column({ type: DataType.JSONB })
  dataResource?: ResearchSubjectDataResource;
}
