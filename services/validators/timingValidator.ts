/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as moment from "moment";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";
export class TimingValidator {
  /**
   * Validates taht given number String is actually a number value
   * @param numberString
   */
  public static validateNumberValue(numberString) {
    let num = true;
    if (numberString.toString().includes(",")) {
      for (const eachValue of numberString.toString().split(",")) {
        if (isNaN(eachValue)) {
          num = false;
          break;
        }
      }
    } else {
      if (isNaN(numberString)) {
        num = false;
      }
    }
    return num;
  }
  /**
   * Validates given timeOfDay is a valid time by checking it against time regex
   * @param timeOfDay
   * @returns {boolean}
   */
  public static validateTime(timeOfDay) {
    log.info("Entering TimingValidator.validateTime()");
    if (!timeOfDay) {
      throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + Constants.TIMING_TIME_OF_DAY);
    }
    for (const time of timeOfDay) {
      const dateRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!dateRegex.test(time)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validates that start and end are actual date strings and their difference is <= 365
   * @param start
   * @param endtiming.repeat.boundsPeriod.start
   */
  public static validateStartEndDates(start, end) {
    log.info("Entering TimingValidator: validateStartEndDates()");
    let isStartAndEndDateValid: boolean = true;
    if (start > end) {
      isStartAndEndDateValid = false;
    }
    const startDate = moment(new Date(start), Constants.INTERNAL_DATE_FORMAT);
    const endDate = moment(new Date(end), Constants.INTERNAL_DATE_FORMAT);
    if (endDate.diff(startDate, "d") > 366) {
      throw new BadRequestResult(errorCodeMap.InvalidRange.value, errorCodeMap.InvalidRange.description);
    }
    return isStartAndEndDateValid;
  }
}
