/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

/**
 * Contains information about device hardware and operating system.
 * Reference:
 * https://developer.apple.com/documentation/uikit/uidevice
 */
export class DeviceInformation {
  /**
   * The name identifying the device.
   * The value of this property is an arbitrary alphanumeric string that is associated with the device as an identifier.
   */
  name: string;

  /**
   * The name of the operating system running on the device represented by the receiver.
   * Example values could be IOS, Android, Windows Mobile etc
   */
  systemName: string;

  /**
   * The current version of the operating system.
   * An example of the system version is @”1.2”.
   */
  systemVersion: string;

  /**
   * The (hardware) model of the device.
   * Possible examples of model strings are @”iPhone” and @”iPod touch”
   */
  model: string;

  /**
   * The device manufacturer.
   * Possible values Apple, Samsung, LG, Mototrola, Sony etc
   * TODO: need to confirm where this is available.
   */
  manufacturer: string;
}
