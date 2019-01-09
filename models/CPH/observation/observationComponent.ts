import { Attachment } from "../../common/attachment";
import { CodeableConcept } from "../../common/codeableConcept";
import { Period } from "../../common/period";
import { Range } from "../../common/range";
import { Ratio } from "../../common/ratio";
import { ReferenceRange } from "../../common/referenceRange";
import { SampleData } from "../../common/sampleData";
import { Quantity } from "../elements/quantity";

interface ObservationComponent {
  code: CodeableConcept;
  dataAbsentReason?: CodeableConcept;
  referenceRange?: ReferenceRange[];
  interpretation?: CodeableConcept;
  valueQuantity?: Quantity;
  valueCodeableConcept?: CodeableConcept;
  valueString?: string;
  valueRange?: Range;
  valueRatio?: Ratio;
  valueSampledData?: SampleData;
  valueAttachment?: Attachment;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: Period;
}
export { ObservationComponent };
