import { Notification } from "./notification";
import { Additional } from "./additional";

/**
 * captures profile settings
 */
class Preference {
  /**
   *Notification preferences to sent any notification to the user
   */
  notification?: Notification;

  /**
   * additional properties that can be custom defined by client
   */
  additional?: Additional[];

}

export { Preference };
