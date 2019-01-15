import { Channel } from "./channel";

/**
 * Individual notification settings for each category
 */
class Setting {
  /**
   *Category of notification. Notification settings defined by server will be prefixed with CPH
   */
  category?: string;

  /**
   * Specifies if notification for the particular category is enabled
   */
  enabled?: boolean;

  /**
   * different channels through which notification can be sent
   */
  channel?: Channel;

}

export { Setting };
