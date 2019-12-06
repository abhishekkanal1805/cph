/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

export class PlatformToken {
  /**
   * Value of platform specific token that can uniquely identify the device and app combination on a platform like APNS, GCM or others.
   */
  token: string;

  /**
   * All token belong to the same device so maybe we can just track whether this is active or not
   * TODO: We need to finalize the possible values and how this differs from device.status
   */
  enabled: boolean;
}
