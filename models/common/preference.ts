/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Additional } from "./additional";
import { Notification } from "./notification";

class Preference {
  notification?: Notification;

  additional?: Additional[];
}

export { Preference };
