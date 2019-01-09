import { Column, DataType, Model, Table } from "sequelize-typescript";
import { CodeableConcept } from "../../common/codeableConcept";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { ObservationComponent } from "./observationComponent";
import { ObservationDataResource } from "./observationDataResource";

@Table({ tableName: "Observation" })
export class Observation extends Model<Observation> {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;
  @Column({ type: DataType.JSONB })
  dataResource: ObservationDataResource;
  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;
  @Column({ type: DataType.JSONB })
  component: ObservationComponent[];
  @Column({ type: DataType.JSONB })
  code: CodeableConcept;
  @Column({ type: DataType.JSONB })
  category: CodeableConcept[];
}
