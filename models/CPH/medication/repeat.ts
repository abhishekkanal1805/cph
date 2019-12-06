/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Duration } from "../../common/duration";
import { Period } from "../../common/period";

/*
 * Timing for Medication related resources
 * */
class Repeat {
  count: number;
  frequency: number;
  period: number;
  periodUnit: string;
  duration: number;
  durationUnit: string;
  timeOfDay: string[];
  dayOfCycle: number[];
  dayOfWeek: string[];
  boundsPeriod: Period;
  boundsDuration: Duration;
}

export { Repeat };
