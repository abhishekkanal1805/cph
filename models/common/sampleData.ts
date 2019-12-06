/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { SimpleQuantity } from "./simpleQuantity";

interface SampleData {
  origin?: SimpleQuantity;
  period?: number;
  factor?: number;
  lowerLimit?: number;
  upperLimit?: number;
  dimensions?: number;
  data?: string;
}
export { SampleData };
