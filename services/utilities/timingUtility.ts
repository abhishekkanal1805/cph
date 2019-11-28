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
  public static calculateStartDateForMedActivity(requestStart, repeat, previousEndDate) {
    log.info("Entering TimingUtility.calculateStartDateForMedActivity()");
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
    } else {
      if (boundsPeriodPresent) {
        log.info("start date calculated as :: " + dateArray[dateArray.length - 1]);
        return dateArray[dateArray.length - 1];
      } else {
        log.info("start date calculated as :: " + TimingUtility.addDays(previousEndDate, 1));
        return TimingUtility.addDays(previousEndDate, 1);
      }
    }
    log.info("Existing TimingUtility.calculateStartDateForMedActivity()");
  }

  /**
   * Generates end date for activity generation
   * @param startDate
   * @param requestEnd
   * @param repeat
   * @param code
   */
  public static calculateEndDateForMedActivity(startDate, requestEnd, repeat, code) {
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
          dateArray.push(TimingUtility.addDays(startDate, repeat.count - 1));
          break;
        case "SDT":
          break;
        case "SDC":
          dateArray.push(TimingUtility.addDays(startDate, repeat.count * repeat.duration - 1));
          break;
        case "SDW":
          dateArray.push(TimingUtility.addDays(startDate, repeat.count * 7 - 1));
          break;
        case "SID":
          dateArray.push(TimingUtility.addDays(startDate, repeat.count * repeat.period - 1));
          break;
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
      log.info("Date Array is " + JSON.stringify(dateArray)); // TODO: remove log
      return dateArray[0];
    }
    log.info("Exiting TimingUtility.calculateEndDateForMedActivity()");
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
   * @param timeOfDay
   * @returns {boolean}
   */
  public static validateTime(timeOfDay) {
    log.info("Entering TimingUtility.validateTime()");
    let validated = true;
    if (!timeOfDay) {
      throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + Constants.TIMING_TIME_OF_DAY);
    }
    for (const time of timeOfDay) {
      const dateRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
      const validationCheck = dateRegex.test(time);

      if (!validationCheck) {
        validated = false;
        break;
      }
    }
    return validated;
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
  public static convertPeriodIntervalToCycle(start, end, period) {
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
      startCycle = startCycle + period;
      nextDay = this.addDays(nextDay, period);
    } while (nextDay <= end);
    return cycle;
  }
}
