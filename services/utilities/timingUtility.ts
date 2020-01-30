/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as moment from "moment";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import * as config from "../../common/objects/config";
import { BadRequestResult } from "../../common/objects/custom-errors";

export class TimingUtility {
  /**
   * Generated start date for generation of activities
   * @param requestStart
   * @param repeat
   * @param previousEndDate
   */
  public static calculateStartDate(requestStart, requestEnd, repeat) {
    log.info("Entering TimingUtility.calculateStartDate()");
    let dateArray = [];
    if (requestStart) {
      dateArray.push(requestStart);
    }
    let boundsPeriodPresent = false;
    if (repeat && repeat.boundsPeriod && repeat.boundsPeriod.start) {
      boundsPeriodPresent = true;
      dateArray.push(repeat.boundsPeriod.start);
    }
    // sort end dates
    dateArray = dateArray.sort((a, b) => moment(a).diff(b)).filter(Boolean);

    if (dateArray.length == 0 && !requestEnd) {
      log.error("startDate is neither present in request nor in boundsPeriod.start object");
      throw new BadRequestResult(errorCodeMap.InvalidRange.value, errorCodeMap.InvalidRange.description);
    } else if (dateArray.length == 0 && requestEnd) {
      return TimingUtility.addMomentDuration(requestEnd, 1, Constants.FHIR_DAY_UNIT);
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
    log.info("Entering TimingUtility.calculateEndDate()");
    let dateArray = [];
    if (requestEnd) {
      dateArray.push(requestEnd);
    }
    if (repeat) {
      if (repeat.boundsPeriod && repeat.boundsPeriod.end) {
        dateArray.push(repeat.boundsPeriod.end);
      }
      if (repeat.boundsDuration && repeat.boundsDuration.value) {
        dateArray.push(TimingUtility.addMomentDuration(startDate, repeat.boundsDuration.value - 1, repeat.boundsDuration.code));
      }
    }
    if (code && repeat.count) {
      switch (code) {
        case "SDY":
          dateArray.push(TimingUtility.addMomentDuration(startDate, repeat.count - 1, Constants.FHIR_DAY_UNIT));
          break;
        case "SDT":
          break;
        case "SDC":
          if (Constants.ALLOWED_DURATION_UNITS.includes(repeat.durationUnit)) {
            dateArray.push(TimingUtility.addMomentDuration(startDate, repeat.count * repeat.duration - 1, repeat.durationUnit));
          }
          break;
        case "SDW":
          dateArray.push(TimingUtility.addMomentDuration(startDate, repeat.count * 7 - 1, "d"));
          break;
        case "SID":
          dateArray.push(TimingUtility.addMomentDuration(startDate, repeat.count * repeat.period - 1, repeat.periodUnit));
          break;
        case "NA":
          const date = TimingUtility.calculateEndDateForCustomCode(repeat, startDate);
          if (date) {
            dateArray.push(date);
          }
      }
    }
    dateArray = dateArray.sort((a, b) => moment(a).diff(b)).filter(Boolean);
    if (dateArray.length == 0) {
      log.info("End date is start date + 365 days");
      return TimingUtility.addMomentDuration(startDate, 365, Constants.FHIR_DAY_UNIT);
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
    log.info("Entering TimingUtility.calculateEndDateForCustomCode()");
    let date;
    if (repeat.dayOfWeek) {
      if (repeat.period && repeat.periodUnit) {
        if (Constants.ALLOWED_UNITS.includes(repeat.periodUnit)) {
          date = TimingUtility.addMomentDuration(startDate, repeat.count * 7 - 1, Constants.FHIR_DAY_UNIT);
        } else {
          date = TimingUtility.addMomentDuration(startDate, repeat.count * repeat.period - 1, repeat.periodUnit);
        }
      }
    } else if (repeat.dayOfCycle) {
      if (Constants.ALLOWED_DURATION_UNITS.includes(repeat.durationUnit)) {
        date = TimingUtility.addMomentDuration(startDate, repeat.count * repeat.duration - 1, repeat.durationUnit);
      }
    } else {
      if (repeat.period && repeat.periodUnit) {
        date = TimingUtility.addMomentDuration(startDate, repeat.count * repeat.period - 1, repeat.periodUnit);
      }
    }
    log.info("Exiting TimingUtility.calculateEndDateForCustomCode()");
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
      nextDay = this.addMomentDuration(nextDay, period, periodUnit);
    } while (nextDay <= end);
    return cycle;
  }

  /**
   * this function adds specified duration to the given date
   * @param date
   * @param period
   * @param periodUnit
   * @returns date
   */
  public static addDuration(date, period, periodUnit) {
    log.info("Entering TimingUtility.addMomentDuration()");
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
      log.info("Exiting TimingUtility.addMomentDuration()");
      return date;
    } catch (err) {
      log.info("error in addDays():" + err);
      throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "period or periodUnit");
    }
  }

  /**
   * this function adds specified duration to the given date using moment library
   * @param date
   * @param period
   * @param periodUnit
   * @returns date
   */
  public static addMomentDuration(date, period, periodUnit) {
    log.info("Entering TimingUtility.addMomentDuration()");
    const offset = moment.parseZone(date).utcOffset();
    const unit = config.unitsMap[periodUnit];
    const dateFormat = moment(date, Constants.DATE_TIME, true).isValid() ? Constants.DATE_TIME : Constants.DATE;
    if (offset == 0) {
      if (dateFormat == Constants.DATE) {
        date = moment
          .utc(date)
          .add(period, unit)
          .format(dateFormat);
      } else {
        date = moment
          .utc(date)
          .add(period, unit)
          .toISOString();
      }
    } else {
      date = moment
        .utc(date)
        .add(period, unit)
        .utcOffset(offset)
        .format(Constants.DATE_TIME);
    }
    log.info("Exiting TimingUtility.addMomentDuration()");
    return date;
  }
}
