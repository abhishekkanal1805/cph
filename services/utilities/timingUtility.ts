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
    let boundsPeriodPresent = false;
    try {
      if (requestStart) {
        dateArray.push(requestStart);
      }
      if (repeat && repeat.boundsPeriod && repeat.boundsPeriod.start) {
        boundsPeriodPresent = true;
        dateArray.push(repeat.boundsPeriod.start);
      }
      // sort end dates
      dateArray = dateArray.sort((dateOne, dateTwo) => moment(dateOne).diff(dateTwo)).filter(Boolean);
    } catch (err) {
      throw new BadRequestResult(errorCodeMap.OperationFailed.value, errorCodeMap.OperationFailed.description);
    }
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
    try {
      if (requestEnd) {
        dateArray.push(requestEnd);
      }
      if (repeat) {
        if (repeat.boundsPeriod && repeat.boundsPeriod.end) {
          dateArray.push(repeat.boundsPeriod.end);
        }
        if (repeat.boundsDuration && repeat.boundsDuration.value) {
          const boundsDurationValue = repeat.boundsDuration.value;
          const boundsDurationCode = repeat.boundsDuration.code;
          dateArray.push(TimingUtility.getEndDateForCode(startDate, boundsDurationValue, boundsDurationCode));
        }
      }
      if (code && repeat.count) {
        switch (code) {
          case "SDY":
            dateArray.push(TimingUtility.getEndDateForCode(startDate, repeat.count, Constants.FHIR_DAY_UNIT));
            break;
          case "SDT":
            break;
          case "SDC":
            dateArray.push(TimingUtility.getEndDateForCode(startDate, repeat.count * repeat.duration, repeat.durationUnit));
            break;
          case "SDW":
            dateArray.push(TimingUtility.getEndDateForCode(startDate, repeat.count * repeat.period, repeat.periodUnit));
            break;
          case "SID":
            dateArray.push(TimingUtility.getEndDateForCode(startDate, repeat.count * repeat.period, repeat.periodUnit));
            break;
          case "NA":
            const date = TimingUtility.calculateEndDateForCustomCode(repeat, startDate);
            if (date) {
              dateArray.push(date);
            }
        }
      }
      // sort date array
      dateArray = dateArray.sort((dateOne, dateTwo) => moment(dateOne).diff(dateTwo)).filter(Boolean);
      log.info("End date calculated as :: " + dateArray[0]);
      log.info("Exiting TimingUtility.calculateEndDate()");
      return dateArray[0];
    } catch (err) {
      throw new BadRequestResult(errorCodeMap.OperationFailed.value, errorCodeMap.OperationFailed.description);
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
    try {
      if (repeat.dayOfWeek) {
        if (repeat.period && repeat.periodUnit) {
          date = TimingUtility.getEndDateForCode(startDate, repeat.count * repeat.period, repeat.periodUnit);
        }
      } else if (repeat.dayOfCycle) {
        if (Constants.ALLOWED_DURATION_UNITS.includes(repeat.durationUnit)) {
          date = TimingUtility.getEndDateForCode(startDate, repeat.count * repeat.duration, repeat.durationUnit);
        }
      } else {
        if (repeat.period && repeat.periodUnit) {
          date = TimingUtility.getEndDateForCode(startDate, repeat.count * repeat.period, repeat.periodUnit);
        }
      }
      log.info("Exiting TimingUtility.calculateEndDateForCustomCode()");
      return date;
    } catch (err) {
      throw new BadRequestResult(errorCodeMap.OperationFailed.value, errorCodeMap.OperationFailed.description);
    }
  }

  /**
   * this function adds specified duration to the given date using moment library
   * @param date
   * @param period
   * @param periodUnit
   * @returns date
   */
  public static getEndDateForCode(inputDate, period, fhirPeriodUnit) {
    log.info("Entering TimingUtility.getEndDateForCode()");
    let date;
    try {
      const offset = moment.parseZone(inputDate).utcOffset();
      const periodUnit = config.unitsMap[fhirPeriodUnit];
      const unit = Constants.DURATION_UNITS.includes(fhirPeriodUnit) ? periodUnit : Constants.DAYS;
      const dateFormat = moment(inputDate, Constants.DATE_TIME, true).isValid() ? Constants.DATE_TIME : Constants.DATE;
      if (offset == 0) {
        // while adding period, moment adds period from next periodUnit value so subtract one periodUnit value
        date = moment
          .utc(inputDate)
          .add(period, periodUnit)
          .subtract(1, unit)
          .endOf(Constants.DAY);
        // if start date contains only date and time then format date according to that only
        if (moment(inputDate, Constants.DATE_TIME_ONLY, true).isValid()) {
          date = date.format(Constants.DATE_TIME_ONLY);
        } else {
          // if format is of date only then format the date other wise return ISO string
          date = dateFormat === Constants.DATE ? date.format(dateFormat) : date.toISOString();
        }
      } else {
        date = moment
          .utc(inputDate)
          .add(period, periodUnit)
          .subtract(1, unit) // while adding period, moment adds period from next periodUnit value so subtract one periodUnit value
          .endOf(Constants.DAY)
          .utcOffset(offset)
          .format(Constants.DATE_TIME);
      }
      log.info("Exiting TimingUtility.getEndDateForCode()");
      return date;
    } catch (err) {
      throw new BadRequestResult(errorCodeMap.OperationFailed.value, errorCodeMap.OperationFailed.description);
    }
  }

  /**
   * this function adds specified duration to the given date using moment library
   * @param date
   * @param period
   * @param periodUnit
   * @returns date
   */
  public static addMomentDuration(inputDate, period, fhirPeriodUnit) {
    log.info("Entering TimingUtility.addMomentDuration()");
    let date;
    try {
      const offset = moment.parseZone(inputDate).utcOffset();
      const periodUnit = config.unitsMap[fhirPeriodUnit];
      const unit = Constants.DURATION_UNITS.includes(fhirPeriodUnit) ? periodUnit : Constants.DAYS;
      const dateFormat = moment(inputDate, Constants.DATE_TIME, true).isValid() ? Constants.DATE_TIME : Constants.DATE;
      if (offset == 0) {
        // while adding period, moment adds period from next periodUnit value so subtract one periodUnit value
        date = moment
          .utc(inputDate)
          .add(period, periodUnit)
          .subtract(1, unit);
        // if start date contains only date and time then format date according to that only
        if (moment(inputDate, Constants.DATE_TIME_ONLY, true).isValid()) {
          date = date.format(Constants.DATE_TIME_ONLY);
        } else {
          // if format is of date only then format the date other wise return ISO string
          date = dateFormat === Constants.DATE ? date.format(dateFormat) : date.toISOString();
        }
      } else {
        date = moment
          .utc(inputDate)
          .add(period, periodUnit)
          .subtract(1, unit) // while adding period, moment adds period from next periodUnit value so subtract one periodUnit value
          .utcOffset(offset)
          .format(Constants.DATE_TIME);
      }
      log.info("Exiting TimingUtility.addMomentDuration()");
      return date;
    } catch (err) {
      throw new BadRequestResult(errorCodeMap.OperationFailed.value, errorCodeMap.OperationFailed.description);
    }
  }
  /**
   * This function checks if start date is there and returns the same else it returns current date as a start date
   * @param start
   * @returns start
   */
  public static getStartDate(start) {
    log.info("Entering TimingUtility.getStartDate()");
    if (!start) {
      start = moment
        .utc()
        .utcOffset(0)
        .toISOString();
    }
    log.info("Exiting TimingUtility.getStartDate()");
    return start;
  }

  /**
   * This function checks if end date is there and returns the same else it constructs end date as start date + 365 days
   * @param start
   * @param end
   * @returns end
   */
  public static getEndDate(start, end) {
    log.info("Entering TimingUtility.getEndDate()");
    try {
      const offset = moment.parseZone(start).utcOffset();
      if (!end) {
        if (offset == 0) {
          // offset zero means start date is a zulu date and end date needs to have same offset as of start dare
          end = moment
            .utc(start)
            .endOf(Constants.DAY)
            .add(1, Constants.YEARS)
            .utcOffset(offset);
          // if start contains only date and time then format end according to that only
          if (moment(start, Constants.DATE_TIME_ONLY, true).isValid()) {
            end = end.format(Constants.DATE_TIME_ONLY);
          } else {
            end = end.toISOString();
          }
        } else {
          // start date is utc date and end date needs to have same offset as of start date
          end = moment
            .utc(start)
            .endOf(Constants.DAY)
            .add(1, Constants.YEARS)
            .utcOffset(offset)
            .format(Constants.DATE_TIME);
        }
      }
      log.info("Exiting TimingUtility.getEndDate()");
      return end;
    } catch (err) {
      throw new BadRequestResult(errorCodeMap.OperationFailed.value, errorCodeMap.OperationFailed.description);
    }
  }

  /**
   * This function formats given date
   * @param endDate
   * @returns endDate
   */
  public static formatEndDate(endDate) {
    log.info("Entering TimingUtility.formatEndDate()");
    const offset = moment.parseZone(endDate).utcOffset();
    if (moment(endDate, Constants.DATE, true).isValid()) {
      log.info("end Date Format is : " + Constants.DATE);
      endDate = moment
        .utc(endDate)
        .endOf(Constants.DAY)
        .utcOffset(offset)
        .toISOString();
    }
    log.info("Exiting TimingUtility.formatEndDate()");
    return endDate;
  }

  /**
   * This function generates date based on given input parameters using moment library.
   * @param start
   * @param timeOfDay
   * @param dayOfWeek
   * @param period
   * @param periodUnit
   * @param startOfDay
   * @param endOfDay
   * @param dateFormat
   * @param count
   * @param offset
   * @returns date
   */
  public static generateDate(start, timeOfDay, dayOfWeek, period, periodUnit, startOfDay, endOfDay, dateFormat, count, offset) {
    log.info("Entering TimingUtility.generateDate()");
    let date;
    try {
      if (offset == 0) {
        date = moment
          .utc(start)
          .add(count * period, periodUnit)
          .startOf(startOfDay)
          .endOf(endOfDay)
          .day(dayOfWeek)
          .add(moment.duration(timeOfDay));
        // if start date contains only date and time then format date according to that only
        if (moment(start, Constants.DATE_TIME_ONLY, true).isValid()) {
          date = date.format(Constants.DATE_TIME_ONLY);
        } else {
          // if format is of date only then format the date other wise return ISO string
          date = dateFormat === Constants.DATE ? date.format(dateFormat) : date.toISOString();
        }
      } else {
        date = moment
          .utc(start)
          .utcOffset(offset)
          .add(count * period, periodUnit)
          .startOf(startOfDay)
          .endOf(endOfDay)
          .day(dayOfWeek)
          .add(moment.duration(timeOfDay))
          .format(dateFormat);
      }
      // log.info("Generated Date : " + date);
      log.info("Exiting TimingUtility.generateDate()");
      return date;
    } catch (err) {
      throw new BadRequestResult(errorCodeMap.OperationFailed.value, errorCodeMap.OperationFailed.description);
    }
  }
}
