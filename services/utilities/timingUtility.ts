/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as moment from "moment";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";

export class TimingUtility {
  /**
   * Generated start date for generation of activities
   * @param requestStart
   * @param repeat
   * @param previousEndDate
   */
  public static calculateStartDate(requestStart, repeat, previousEndDate) {
    log.info("Calculating start Date for MedActivity");
    let dateArray = [];
    if (requestStart) {
      dateArray.push(new Date(requestStart));
    }
    let boundsPeriodPresent = false;
    if (repeat && repeat.boundsPeriod && repeat.boundsPeriod.start) {
      boundsPeriodPresent = true;
      dateArray.push(new Date(repeat.boundsPeriod.start));
    }
    dateArray = dateArray
      .sort((a, b) => {
        return a.getTime() - b.getTime();
      })
      .filter(Boolean);
    if (dateArray.length == 0 && !previousEndDate) {
      log.error("startDate is neither present in request nor in boundsPeriod.start object");
      throw new BadRequestResult(errorCodeMap.InvalidRange.value, errorCodeMap.InvalidRange.description);
    } else if (dateArray.length == 0 && previousEndDate) {
      return TimingUtility.addDays(previousEndDate, 1);
    } else if (requestStart && boundsPeriodPresent) {
      log.info("start date calculated as :: " + dateArray[dateArray.length - 1]);
      return dateArray[dateArray.length - 1];
    } else if ((requestStart && !boundsPeriodPresent) || (!requestStart && boundsPeriodPresent)) {
      log.info("start date calculated as :: " + dateArray[0]);
      return dateArray[0];
    }
  }

  /**
   * Generates end date for activity generation
   * @param startDate
   * @param requestEnd
   * @param repeat
   * @param code
   */
  public static calculateEndDate(startDate, requestEnd, repeat, code) {
    log.info("Entering TimingUtility.calculateEndDateForMedActivity()");
    let dateArray = [];
    if (requestEnd) {
      dateArray.push(new Date(requestEnd));
    }
    if (repeat) {
      if (repeat.boundsPeriod && repeat.boundsPeriod.end) {
        dateArray.push(new Date(repeat.boundsPeriod.end));
      }
      if (repeat.boundsDuration && repeat.boundsDuration.value) {
        dateArray.push(TimingUtility.addDays(startDate, repeat.boundsDuration.value - 1));
      }
    }
    if (code && repeat.count) {
      switch (code) {
        case "SDY":
          dateArray.push(TimingUtility.addDuration(startDate, repeat.count - 1, "d"));
          break;
        case "SDT":
          break;
        case "SDC":
          if (["d", "wk", "mo", "a"].includes(repeat.durationUnit)) {
            dateArray.push(TimingUtility.addDuration(startDate, repeat.count * repeat.duration - 1, repeat.durationUnit));
          }
          break;
        case "SDW":
          if (repeat.period && repeat.periodUnit) {
            if (["s", "min", "h", "d"].includes(repeat.periodUnit)) {
              dateArray.push(TimingUtility.addDuration(startDate, repeat.count * 7 - 1, "d"));
            } else {
              dateArray.push(TimingUtility.addDuration(startDate, (repeat.count - 1) * repeat.period, repeat.periodUnit));
            }
          }
          break;
        case "SID":
          if (repeat.period && repeat.periodUnit) {
            dateArray.push(TimingUtility.addDuration(startDate, (repeat.count - 1) * repeat.period, repeat.periodUnit));
          }
          break;
        case "NA":
          const date = TimingUtility.calculateEndDateForCustomCode(repeat, startDate);
          if (date) {
            dateArray.push(date);
          }
      }
    }
    dateArray = dateArray
      .sort((a, b) => {
        return a.getTime() - b.getTime();
      })
      .filter(Boolean);
    if (dateArray.length == 0) {
      log.info("End date is start date + 365 days");
      return TimingUtility.addDays(startDate, TimingUtility.calculateDaysInFullYear(startDate));
    } else {
      log.info("End date is " + dateArray[0]);
      return dateArray[0];
    }
  }

  /**
   * Generates end date for activity generation
   * @param startDate
   * @param requestEnd
   * @param repeat
   * @param code
   */
  public static calculateEndDateForCustomCode(repeat, startDate) {
    log.info("Entering TimingUtility.calculateEndDateForMedActivity()");
    let date;
    if (repeat.dayOfWeek) {
      if (repeat.period && repeat.periodUnit) {
        if (["s", "min", "h", "d"].includes(repeat.periodUnit)) {
          date = TimingUtility.addDuration(startDate, repeat.count * 7 - 1, "d");
        } else {
          date = TimingUtility.addDuration(startDate, (repeat.count - 1) * repeat.period, repeat.periodUnit);
        }
      } else {
        // TODO: error needs to be thrown if period and periodUnit is not specified
        date = TimingUtility.addDuration(startDate, repeat.count * 7 - 1, "d");
      }
    } else if (repeat.dayOfCycle) {
      if (["d", "wk", "mo", "a"].includes(repeat.durationUnit)) {
        date = TimingUtility.addDuration(startDate, repeat.count * repeat.duration - 1, repeat.durationUnit);
      } // TODO: check if durationUnit specified as "s", "min", "h" error needs to be thrown or not
    } else {
      if (repeat.period && repeat.periodUnit) {
        date = TimingUtility.addDuration(startDate, (repeat.count - 1) * repeat.period, repeat.periodUnit);
      }
    }
    return date;
  }

  /**
   * @param cDate
   * @param days
   * @returns {Date}
   */
  public static addDays(cDate, days) {
    log.info("Entering TimingUtility.addDays()");
    try {
      const date = new Date(cDate);
      date.setDate(date.getDate() + days);
      return date;
    } catch (err) {
      log.debug("error in addDays():" + err);
      return new Date(cDate);
    }
  }

  /**
   * @param startDate
   * @param endDate
   * @returns {any[]}
   */
  public static getDates(startDate, endDate) {
    log.info("Entering TimingUtility.getDates()");
    const dates = [];
    let currentDate = startDate;
    try {
      while (currentDate <= endDate) {
        dates.push(currentDate);
        currentDate = this.addDays(currentDate, 1);
      }
    } catch (err) {
      log.debug("error in getDates():" + err);
      return [];
    }
    return dates;
  }

  /**
   * takes the start date and determines number of days in between 365 or 366
   * @param startDate
   * @returns {number}
   */
  public static calculateDaysInFullYear(startDate) {
    const endDate = moment.utc(startDate).add(365, "d");
    return this.daysBetweenDates(startDate, endDate.toString());
  }

  /**
   * determine the maximum allowed date range
   * @param {string} startDate
   * @param {string} endDate
   * @returns {number}
   */
  public static daysBetweenDates(startDate: string, endDate: string) {
    return Math.floor((Date.parse(endDate) - Date.parse(startDate)) / 86400000);
  }

  /**
   * this function generates cycle interval within a given range of days and the period
   * @param start
   * @param end
   * @param period
   * @returns {any[]}
   */
  public static convertPeriodIntervalToCycle(start, end, period, periodUnit) {
    log.info("Entering TimingUtility.convertPeriodIntervalToCycle()");
    let nextDay;
    const cycle = [];
    let startCycle = period;
    start = new Date(start);
    end = new Date(end);
    nextDay = start;
    do {
      if (nextDay <= end) {
        if (nextDay === start) {
          startCycle = 0;
        }
        cycle.push(startCycle);
      }
      log.info("cycles" + JSON.stringify(cycle));
      startCycle = startCycle + period;
      nextDay = this.addDuration(nextDay, period, periodUnit);
    } while (nextDay <= end);
    return cycle;
  }

  public static addDuration(cDate, period, periodUnit) {
    log.info("Entering TimingUtility.addDuration()");
    const date = new Date(cDate);
    try {
      if (periodUnit == "s") {
        date.setSeconds(date.getSeconds() + period);
      } else if (periodUnit == "min") {
        date.setMinutes(date.getMinutes() + period);
      } else if (periodUnit == "h") {
        date.setHours(date.getHours() + period);
      } else if (periodUnit == "d") {
        date.setDate(date.getDate() + period);
      } else if (periodUnit == "wk") {
        date.setDate(date.getDate() + period * 7);
      } else if (periodUnit == "mo") {
        date.setMonth(date.getMonth() + period);
      } else {
        throw new Error();
      }
      return date;
    } catch (err) {
      log.info("error in addDays():" + err);
      throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "period or periodUnit");
    }
  }

  public static convertDatesToCount(start, end, period, periodUnit) {
    const diffDays = end.diff(start, Constants.DAYS);
    log.info("diffDays --------------" + diffDays);
    let repetitions;
    switch (periodUnit) {
      case Constants.FHIR_HOUR_UNIT:
        repetitions = Math.floor(diffDays / (period / 24));
        break;
      case Constants.FHIR_DAY_UNIT:
        repetitions = Math.floor(diffDays / period);
        break;
      case Constants.FHIR_WEEK_UNIT:
        repetitions = Math.floor(diffDays / (period * 7));
        break;
      case Constants.FHIR_MONTH_UNIT:
        repetitions = Math.floor(diffDays / (period * 31));
        break;
      case Constants.FHIR_YEAR_UNIT:
        repetitions = Math.floor(diffDays / (period * 365));
        break;
    }
    return repetitions;
  }
}
