/*
 * Timing for Medication related resources
 * */
import { Repeat } from "./repeat";

class Timing {
  notification: number;
  notificationUnit: string;
  event: string[];
  repeat: Repeat;
  code: string;
}

export { Timing };
