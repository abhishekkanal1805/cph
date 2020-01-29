/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */
import * as log from "lambda-log";
import * as _ from "lodash";
import * as moment from "moment";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import * as config from "../../common/objects/config";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { TimingValidator } from "../validators/timingValidator";
import { TimingUtility } from "./timingUtility";

export class TimingEventsGenerator {
  /**
   * This function generates activities by reading timing and repeat object
   * @param timing
   * @param start request start parameter
   * @param end request end parameter
   * @returns events array
   */
  public static generateDateEventsFromTiming(timing: any, requestStartDate: string, requestEndDate: string) {
    log.info("Entering TimingEventsGenerator.generateDateEventsFromTiming()");
    let events: any = [];
    // timing element is mandatory
    if (timing) {
      requestStartDate = this.getStartDate(requestStartDate);
      log.info("start ---: " + requestStartDate);
      requestEndDate = this.getEndDate(requestStartDate, requestEndDate);
      log.info("endDate ---: " + requestEndDate);
      // if found EVENT array, ignore everything else and use the dates specified there
      if (timing.event) {
        log.info("timing  event object found. Generating events using event object");
        if (Array.isArray(timing.event) && timing.event.length != 0) {
          log.info("EVENT:generateSDTEvents with: " + timing.event);
          events = TimingEventsGenerator.generateSDTEvents(timing.event, requestStartDate, requestEndDate, true);
        } else {
          log.error("timing.event is not an array or empty");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "timing.event");
        }
      } else {
        let code;
        // if code present then validate code related attributes
        if (timing.code && timing.code.coding && timing.code.coding[0] && timing.code.coding[0].code) {
          // validate the attributes required with code to generate events
          this.validateAttributesRequiredWithCode(timing);
        } else {
          if (timing.repeat.timeOfDay) {
            // if code attribute is not present then try to identify code by looking at relevant attributes
            code = TimingEventsGenerator.identifyCodeBasedOnAttributes(timing);
            _.set(timing, "code.coding[0].code", code);
            this.validateAttributesRequiredWithCode(timing);
          } else {
            // set code as NA for custom implementation
            code = "NA";
            _.set(timing, "code.coding[0].code", code);
            // validate attributes of repeat attribute for custom implementation
            this.validateAttributesRequiredForCustomCode(timing);
          }
        }
        log.info("Code identified as: " + code);
        requestStartDate = TimingUtility.calculateStartDate(requestStartDate, timing.repeat, requestEndDate);
        requestEndDate = TimingUtility.calculateEndDate(requestStartDate, requestEndDate, timing.repeat, timing.code.coding[0].code);
        if (requestStartDate && requestEndDate) {
          TimingValidator.validateStartEndDates(requestStartDate, requestEndDate);
        }
        events = TimingEventsGenerator.generateEventsFromCode(requestStartDate, requestEndDate, timing);
        if (events.length > 1) {
          events = events.sort((a, b) => moment(a).diff(b)).filter(Boolean);
        }
      }
    }
    log.info("Existing TimingEventsGenerator.generateDateEventsFromTiming()" + moment().toISOString());
    return events;
  }

  /**
   * Calculates timing.code programmatically in case no code is provided
   * @param repeat
   * @returns code
   */
  public static identifyCodeBasedOnAttributes(timing: any) {
    log.info("Entering TimingEventsGenerator.identifyCodeBasedOnAttributes ()");
    const repeat = timing.repeat;
    let code;
    if (repeat.dayOfWeek) {
      code = "SDW";
    } else if (repeat.dayOfCycle) {
      code = "SDC";
    } else if (repeat.period && repeat.periodUnit) {
      code = "SID";
    } else if (repeat.timeOfDay) {
      code = "SDY";
    } else {
      log.error("Timing code cannot be identified");
      throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat");
    }
    log.info("Existing TimingEventsGenerator.identifyCodeBasedOnAttributes()");
    return code;
  }

  /**
   * This function generate events from code specified Entering timing.code.coding[0].cod
   * @param startDate
   * @param endDate
   * @param timing
   * @returns  events array
   */
  public static generateEventsFromCode(startDate: string, endDate: string, timing: any) {
    log.info("Entering TimingEventsGenerator.generateEventsFromCode()");
    const repeat = timing.repeat;
    let events: any = [];
    switch (timing.code.coding[0].code) {
      case "SDY":
        log.info("SDY:generateSDYEvents with: " + startDate + ", " + endDate + ", " + repeat.timeOfDay);
        events = this.generateSDYEvents(startDate, endDate, repeat);
        break;
      case "SDW":
        log.info("SDW:generateSDWEvents with: " + startDate + ", " + endDate + ", " + repeat.dayOfWeek + ", " + repeat.timeOfDay);
        events = this.generateSDWEvents(startDate, endDate, repeat);
        break;
      case "SDC":
        log.info("SDC:generateCycleEvents with: " + startDate + ", " + endDate + ", " + repeat.dayOfCycle + ", " + repeat.timeOfDay + ", " + repeat.duration);
        events = this.generateSDCEvents(startDate, endDate, repeat);
        break;
      case "SID":
        log.info("SID:generateSIDEvents with: " + startDate + ", " + endDate);
        events = this.generateSIDEvents(startDate, endDate, repeat);
        break;
      case "NA":
        log.info("Generate events with custom implementation: " + startDate + ", " + endDate);
        events = this.generateCustomEvents(startDate, endDate, repeat);
        break;
      default:
        log.error("Invalid timing.code provided");
        throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + Constants.TIMING_CODE);
    }
    log.info("Exiting TimingEventsGenerator.generateEventsFromCode()");
    return events;
  }

  /**
   * This function validates attributes required with code to generate events
   * @param timing
   */

  public static validateAttributesRequiredWithCode(timing: any) {
    log.info("Entering TimingEventsGenerator.validateAttributesRequiredWithCode()");
    const repeat = timing.repeat;
    if (!repeat.timeOfDay) {
      log.error("timeOfDay is not present or not an array or of 0 length");
      throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.timeOfDay");
    }
    switch (timing.code.coding[0].code) {
      case "SDY":
        log.info("SDY Code attributes validated successfully.");
        break;
      case "SDW":
        if (!repeat.dayOfWeek) {
          log.error("dayOfWeek is not present or not an array or of 0 length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.dayOfWeek");
        }
        if (!repeat.period && !repeat.periodUnit) {
          log.error("repeat.period is not present ");
          throw new BadRequestResult(
            errorCodeMap.InvalidElementValue.value,
            errorCodeMap.InvalidElementValue.description + "repeat.period or repeat.periodUnit"
          );
        }
        log.info("SDW Code attributes validated successfully.");
        break;
      case "SDC":
        if (!repeat.dayOfCycle || !TimingValidator.validateNumberValue(repeat.dayOfCycle)) {
          log.error("dayOfCycle is not present or not an array or of 0 length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.dayOfCycle");
        }
        if (!repeat.duration || !TimingValidator.validateNumberValue(repeat.duration)) {
          log.error("repeat.duration is not present or not a valid number");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.duration");
        }
        if (!repeat.durationUnit || Constants.ALLOWED_UNITS.includes(repeat.durationUnit)) {
          log.error("repeat.durationUnit is invalid. DurationUnit can be in days, weeks, months and year");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.durationUnit");
        }
        log.info("SDC Code attributes validated successfully.");
        break;

      case "SID":
        if (!repeat.period && !repeat.periodUnit) {
          log.error("repeat.period is not present ");
          throw new BadRequestResult(
            errorCodeMap.InvalidElementValue.value,
            errorCodeMap.InvalidElementValue.description + "repeat.period or repeat.periodUnit"
          );
        }
        log.info("SID Code attributes validated successfully.");
        break;
      default:
        log.error("Invalid timing.code provided");
        throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + Constants.TIMING_CODE);
    }
    log.info("Exiting TimingEventsGenerator.validateAttributesRequiredWithCode()");
  }

  /**
   * This function validates repeat attributes required for custom implementation to generate events
   * @param timing
   */

  public static validateAttributesRequiredForCustomCode(timing: any) {
    log.info("Entering TimingEventsGenerator.validateAttributesRequiredForCustomCode()");
    const repeat = timing.repeat;
    if (!repeat.frequency && !repeat.period && !repeat.periodUnit) {
      log.error("repeat.frequency or repeat.period or repeat.periodUnit is not present");
      throw new BadRequestResult(
        errorCodeMap.InvalidElementValue.value,
        errorCodeMap.InvalidElementValue.description + "repeat.frequency or repeat.period or repeat.periodUnit"
      );
    }
    if (repeat.dayOfCycle) {
      if (!repeat.duration || !TimingValidator.validateNumberValue(repeat.duration)) {
        log.error("repeat.duration is not present or not a valid number");
        throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.duration");
      }
      if (!repeat.durationUnit || Constants.ALLOWED_UNITS.includes(repeat.durationUnit)) {
        log.error("repeat.durationUnit is invalid. DurationUnit can be in days, weeks, months and year");
        throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.durationUnit");
      }
    }
    log.info("Exiting TimingEventsGenerator.validateAttributesRequiredForCustomCode()");
  }

  /**
   * @param eventArray
   * @param start
   * @param end
   * @param limitEvents
   * @returns events
   */
  public static generateSDTEvents(eventArray, start, end, limitEvents) {
    log.info("Entering TimingEventsGenerator.generateSDTEvents()");
    // sort the event array of dates as they could appear scattered
    eventArray = [...new Set(eventArray)];
    const events = [];
    for (let date of eventArray) {
      date = moment.utc(date).format(Constants.DATE_TIME);
      if (limitEvents && moment(start).isSameOrBefore(date) && moment(end).isSameOrAfter(date)) {
        events.push(new Date(date));
      } else if (!limitEvents) {
        events.push(new Date(date));
      }
    }
    log.info("Exiting TimingEventsGenerator.generateSDTEvents()");
    return events;
  }

  /**
   * Generated SID events
   * @param start
   * @param end
   * @param period
   * @param timeOfDay
   */
  public static generateSIDEvents(startDate, endDate, repeat: any) {
    log.info("Entering TimingEventsGenerator.generateSIDEvents()");
    const events = [];
    const startDt = startDate;
    endDate = this.formatEndDate(endDate);
    const offset = moment.parseZone(startDate).utcOffset();
    const unit = config.unitsMap[repeat.periodUnit];
    // for each time in the timeOfDay array generate dates for given period
    for (const time of repeat.timeOfDay) {
      let count = 0;
      let date = startDt;
      while (moment(date).isSameOrBefore(endDate)) {
        date = this.generateDate(startDt, time, "", repeat.period, unit, Constants.DAY, "", Constants.DATE_TIME, count, offset);
        if (moment(startDate).isSameOrBefore(date) && moment(endDate).isSameOrAfter(date)) {
          events.push(date);
        }
        count++;
      }
    }
    log.info("Exiting TimingEventsGenerator.generateSIDEvents()");
    return events;
  }

  /**
   * Generates SDC events
   * @param start
   * @param end
   * @param dayOfCycle
   * @param timeOfDay
   * @param duration
   * @returns events
   */
  public static generateSDCEvents(startDate, endDate, repeat) {
    log.info("Entering TimingEventsGenerator.generateSDCEvents()");
    let nextDay;
    const events = [];
    endDate = this.formatEndDate(endDate);
    const offset = moment.parseZone(startDate).utcOffset();
    // map FHIR unit to standard unit
    const durationUnit = config.unitsMap[repeat.durationUnit];
    for (const time of repeat.timeOfDay) {
      // format start date and set timeOfDay
      let start = this.generateDate(startDate, time, "", "", "", Constants.DAY, "", Constants.DATE_TIME, 0, offset);
      nextDay = start;
      let shouldContinue = true;
      while (shouldContinue) {
        for (const cycleDay of repeat.dayOfCycle) {
          // if cycleOfDay is one then insert startDate into events array
          if (cycleDay === 1) {
            if (moment(startDate).isSameOrBefore(nextDay)) {
              events.push(start);
            }
          } else {
            // generate date using dayOfCycle
            nextDay = this.generateDate(start, "", "", cycleDay.valueOf() - 1, Constants.DAYS, "", "", Constants.DATE_TIME, 1, offset);
            if (moment(nextDay).isSameOrAfter(endDate)) {
              shouldContinue = false;
              break;
            }
            events.push(nextDay);
          }
          /* if cycleDay is last day from dayOfCycle array then calculate the end date of cycle
             and no of days remaining days of the cycle*/
          if (cycleDay.valueOf() === repeat.dayOfCycle[repeat.dayOfCycle.length - 1]) {
            const cycleEndDate = this.generateDate(start, "", "", repeat.duration, durationUnit, "", "", Constants.DATE_TIME, 1, offset);
            const remainingDays = moment(cycleEndDate).diff(nextDay, Constants.DAYS);
            nextDay = this.generateDate(start, "", "", cycleDay + remainingDays, Constants.DAYS, "", "", Constants.DATE_TIME, 1, offset);
            if (moment(nextDay).isSameOrAfter(endDate)) {
              shouldContinue = false;
              break;
            }
            // after completion of one cycle update the start date for next cycle
            start = nextDay;
          }
        }
      }
    }
    log.info("Exiting TimingEventsGenerator.generateSDCEvents()");
    return events;
  }

  /**
   * Generated SDW events
   * @param start
   * @param end
   * @param dayOfWeek
   * @param timeOfDay
   */
  public static generateSDWEvents(startDate, endDate, repeat) {
    log.info("Entering TimingEventsGenerator.generateSDWEvents()");
    // code says Specific times on specify days in a week
    const events = [];
    const startDt = startDate;
    endDate = this.formatEndDate(endDate);
    const offset = moment.parseZone(startDate).utcOffset();
    const period = 7;
    const periodUnit = Constants.DAYS;
    // const unit = config.unitsMap[repeat.periodUnit]; // map FHIR unit to standard unit
    if ([Constants.FHIR_DAY_UNIT, Constants.FHIR_WEEK_UNIT, Constants.FHIR_MONTH_UNIT, Constants.FHIR_YEAR_UNIT].includes(repeat.periodUnit)) {
      // set timeOfDay to every day from dayOfWeek array
      for (const time of repeat.timeOfDay) {
        for (const day of repeat.dayOfWeek) {
          let count = 0;
          let date = startDt;
          while (moment(date).isSameOrBefore(endDate)) {
            date = this.generateDate(startDt, time, day, period, periodUnit, Constants.DAY, "", Constants.DATE_TIME, count, offset);
            // check if generated date falls within start and end date range
            if (moment(startDate).isSameOrBefore(date) && moment(endDate).isSameOrAfter(date)) {
              events.push(date);
            }
            count++;
          }
        }
      }
    }
    log.info("Exiting TimingEventsGenerator.generateSDWEvents()");
    return events;
  }

  /**
   * Generated SDY events
   * @param start
   * @param end
   * @param timeOfDay
   * @returns events
   */
  public static generateSDYEvents(startDate, endDate, repeat) {
    log.info("Entering TimingEventsGenerator.generateSDYEvents()");
    const events = [];
    const startDt = startDate;
    endDate = this.formatEndDate(endDate);
    const offset = moment.parseZone(startDate).utcOffset();
    for (const time of repeat.timeOfDay) {
      let count = 0;
      let date = startDt;
      while (moment(date).isSameOrBefore(endDate)) {
        date = this.generateDate(startDt, time, "", 1, Constants.DAYS, Constants.DAY, "", Constants.DATE_TIME, count, offset);
        // check if generated date falls within start and end date range
        if (moment(startDate).isSameOrBefore(date) && moment(endDate).isSameOrAfter(date)) {
          events.push(date);
        }
        count++;
      }
    }
    log.info("Exiting TimingEventsGenerator.generateSDYEvents()");
    return events;
  }

  /**
   * Generated Custom events
   * @param start
   * @param end
   * @param repeat
   * @returns events
   */
  public static generateCustomEvents(start, end, repeat) {
    log.info("Entering TimingEventsGenerator.generateCustomEvents()");
    let events = [];
    // TODO: check if frequency, period and periodUnit are mandatory, if so then what to do if not specified
    if (repeat.dayOfWeek) {
      log.info("Generate events based on dayOfWeek");
      events = this.generateEventsBasedOnDayOfWeek(start, end, repeat);
    } else if (repeat.dayOfCycle) {
      log.info("Generate events based on dayOfCycle");
      // TODO: need to write the logic to generate events based on dayOfCycle
    } else if (repeat.period && repeat.periodUnit) {
      events = this.generateEventsBasedOnPeriod(start, end, repeat);
    }
    log.info("Exiting TimingEventsGenerator.generateCustomEvents()");
    return events;
  }

  /**
   * Generate events based on period and periodUnit
   * @param start
   * @param end
   * @param repeat
   * @returns events
   */
  public static generateEventsBasedOnPeriod(start, end, repeat) {
    log.info("Entering TimingEventsGenerator.generateEventsBasedOnPeriod()");
    const events = [];
    end = this.formatEndDate(end);
    const offset = moment.parseZone(start).utcOffset();
    const unit = config.unitsMap[repeat.periodUnit];
    const dateFormat =
      Constants.ALLOWED_UNITS.includes(repeat.periodUnit) || moment(start, Constants.DATE_TIME, true).isValid() ? Constants.DATE_TIME : Constants.DATE;
    // for each time in the timeOfDay array generate dates for given period
    let count = 0;
    let date = start;
    while (moment(date).isSameOrBefore(end)) {
      for (let frequency = 0; frequency < repeat.frequency; frequency++) {
        date = this.generateDate(start, "", "", repeat.period, unit, "", "", dateFormat, count, offset);
        if (moment(start).isSameOrBefore(date) && moment(end).isSameOrAfter(date)) {
          events.push(date);
        }
      }
      count++;
    }
    log.info("Exiting TimingEventsGenerator.generateEventsBasedOnPeriod()");
    return events;
  }

  /**
   * Generate events based on period and periodUnit
   * @param start
   * @param end
   * @param repeat
   * @returns events
   */
  public static generateEventsBasedOnDayOfWeek(startDate, endDate, repeat) {
    log.info("Entering TimingEventsGenerator.generateEventsBasedOnDayOfWeek()");
    const events = [];
    const start = startDate;
    endDate = this.formatEndDate(endDate);
    const offset = moment.parseZone(start).utcOffset();
    const unit = config.unitsMap[repeat.periodUnit];
    const dateFormat =
      Constants.ALLOWED_UNITS.includes(repeat.periodUnit) || moment(start, Constants.DATE_TIME, true).isValid() ? Constants.DATE_TIME : Constants.DATE;
    for (const day of repeat.dayOfWeek) {
      let count = 0;
      let date = start;
      while (moment(date).isSameOrBefore(endDate)) {
        if (Constants.ALLOWED_UNITS.includes(repeat.periodUnit)) {
          const period = 7;
          const periodUnit = Constants.DAYS;
          date = this.generateDate(start, "", day, period, periodUnit, Constants.DAY, "", dateFormat, count, offset);
          const dayEndTime = this.generateDate(date, "", day, "", "", "", Constants.DAY, Constants.DATE_TIME, 0, offset);
          for (let frequency = 0; frequency < repeat.frequency; frequency++) {
            date = this.generateDate(date, "", "", repeat.period, unit, "", "", dateFormat, frequency, offset);
            // check if generated date falls within start and end date range
            if (moment(date).isSameOrBefore(dayEndTime) && moment(startDate).isSameOrBefore(date) && moment(endDate).isSameOrAfter(date)) {
              events.push(date);
            }
          }
        } else {
          for (let frequency = 0; frequency < repeat.frequency; frequency++) {
            date = this.generateDate(start, "", "", repeat.period, unit, "", "", dateFormat, count, offset);
            // check if generated date's day is given dayOfWeek array
            if (
              moment(date)
                .format("ddd")
                .toLowerCase() == day
            ) {
              // check if generated date falls within start and end date range
              if (moment(startDate).isSameOrBefore(date) && moment(endDate).isSameOrAfter(date)) {
                events.push(date);
              }
            }
          }
        }
        count++;
      }
    }
    log.info("Exiting TimingEventsGenerator.generateEventsBasedOnDayOfWeek()");
    return events;
  }

  /**
   * This function checks if start date is there and returns the same else it returns current date as a start date
   * @param start
   * @returns start
   */
  public static getStartDate(start) {
    log.info("Entering TimingEventsGenerator.getStartDate()");
    if (!start) {
      start = moment
        .utc()
        .startOf(Constants.DAY)
        .utcOffset(0)
        .toISOString();
    }
    log.info("Exiting TimingEventsGenerator.getStartDate()");
    return start;
  }

  /**
   * This function checks if end date is there and returns the same else it constructs end date as start date + 365 days
   * @param start
   * @param end
   * @returns end
   */
  public static getEndDate(start, end) {
    log.info("Entering TimingEventsGenerator.getEndDate()");
    const offset = moment.parseZone(start).utcOffset();
    if (!end) {
      if (offset == 0) {
        // offset zero means start date is a zulu date and end date needs to have same offset as of start dare
        end = moment
          .utc()
          .endOf(Constants.DAY)
          .add(365, Constants.DAYS)
          .utcOffset(offset)
          .toISOString();
      } else {
        // start date is utc date and end date needs to have same offset as of start date
        end = moment
          .utc(start)
          .endOf(Constants.DAY)
          .add(365, Constants.DAYS)
          .utcOffset(offset)
          .format(Constants.DATE_TIME);
      }
    }
    log.info("Exiting TimingEventsGenerator.getEndDate()");
    return end;
  }

  /**
   * This function formats given date
   * @param endDate
   * @returns endDate
   */
  public static formatEndDate(endDate) {
    log.info("Entering TimingEventsGenerator.formatEndDate()");
    const offset = moment.parseZone(endDate).utcOffset();
    if (moment(endDate, Constants.DATE, true).isValid()) {
      log.info("end Date Format is : " + Constants.DATE);
      endDate = moment
        .utc(endDate)
        .endOf(Constants.DAY)
        .utcOffset(offset)
        .toISOString();
    }
    log.info("Exiting TimingEventsGenerator.formatEndDate()");
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
    log.info("Entering TimingEventsGenerator.generateDate()");
    let date;
    if (offset == 0) {
      if (dateFormat == Constants.DATE) {
        date = moment
          .utc(start)
          .add(count * period, periodUnit)
          .startOf(startOfDay)
          .endOf(endOfDay)
          .day(dayOfWeek)
          .add(moment.duration(timeOfDay))
          .format(dateFormat);
      } else {
        date = moment
          .utc(start)
          .add(count * period, periodUnit)
          .startOf(startOfDay)
          .endOf(endOfDay)
          .day(dayOfWeek)
          .add(moment.duration(timeOfDay))
          .toISOString();
      }
    } else {
      date = moment
        .utc(start)
        .utcOffset(offset)
        .add(periodUnit, count * period)
        .startOf(startOfDay)
        .endOf(endOfDay)
        .day(dayOfWeek)
        .add(moment.duration(timeOfDay))
        .format(dateFormat);
    }
    log.info("Generated Date : " + date);
    log.info("Exiting TimingEventsGenerator.generateDate()");
    return date;
  }
}
