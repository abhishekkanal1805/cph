import { Setting } from "./setting";

/**
 * Notification preferences to sent any notification to the user
 */
class Notification {
  /**
   *to enable or disable all notifications
   */
  enableNotification?: boolean;

  /**
   * individual notification preferences for each category
   */
  settings?: Setting;

}

export { Notification };
