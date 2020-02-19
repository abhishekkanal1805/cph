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
    let code;
    let isStartAndEndDateValid;
    // timing element is mandatory
    if (timing) {
      requestStartDate = TimingUtility.getStartDate(requestStartDate);
      log.info("start ---: " + requestStartDate);
      requestEndDate = TimingUtility.getEndDate(requestStartDate, requestEndDate);
      log.info("endDate ---: " + requestEndDate);
      // if found EVENT array, ignore everything else and use the dates specified there
      if (timing.event) {
        log.info("timing  event object found. Generating events using event object");
        if (Array.isArray(timing.event) && timing.event.length != 0) {
          log.info("EVENT:generateSDTEvents with: " + timing.event);
          if (timing.code && timing.code.coding && timing.code.coding[0] && timing.code.coding[0].code) {
            code = timing.code.coding[0].code;
            log.info("Code : " + code);
            if (code != "SDT") {
              throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + Constants.TIMING_CODE);
            }
          }
          requestStartDate = TimingUtility.calculateStartDate(requestStartDate, requestEndDate, timing.repeat);
          requestEndDate = TimingUtility.calculateEndDate(requestStartDate, requestEndDate, timing.repeat, code);
          isStartAndEndDateValid = TimingValidator.validateStartEndDates(requestStartDate, requestEndDate);
          if (isStartAndEndDateValid) {
            events = TimingEventsGenerator.generateSDTEvents(timing.event, requestStartDate, requestEndDate, true);
          }
        } else {
          log.error("timing.event is not an array or empty");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "timing.event");
        }
      } else {
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
        requestStartDate = TimingUtility.calculateStartDate(requestStartDate, requestEndDate, timing.repeat);
        requestEndDate = TimingUtility.calculateEndDate(requestStartDate, requestEndDate, timing.repeat, timing.code.coding[0].code);
        isStartAndEndDateValid = TimingValidator.validateStartEndDates(requestStartDate, requestEndDate);
        if (isStartAndEndDateValid) {
          events = TimingEventsGenerator.generateEventsFromCode(requestStartDate, requestEndDate, timing);
        }
      }
    }
    if (events.length > 1) {
      events = events.sort((dateOne, dateTwo) => moment(dateOne).diff(dateTwo)).filter(Boolean);
    }
    log.info("Existing TimingEventsGenerator.generateDateEventsFromTiming()");
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
        if (repeat.period && repeat.periodUnit) {
          if (!Constants.ALLOWED_DURATION_UNITS.includes(repeat.periodUnit)) {
            log.error("repeat.periodUnit is invalid. periodUnit can be in days, weeks, months and year");
            throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.periodUnit");
          }
        } else {
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
        if (!repeat.durationUnit || !Constants.ALLOWED_DURATION_UNITS.includes(repeat.durationUnit)) {
          log.error("repeat.durationUnit is invalid. DurationUnit can be in days, weeks, months and year");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.durationUnit");
        }
        log.info("SDC Code attributes validated successfully.");
        break;

      case "SID":
        if (repeat.period && repeat.periodUnit) {
          if (!Constants.ALLOWED_DURATION_UNITS.includes(repeat.periodUnit)) {
            log.error("repeat.periodUnit is invalid. periodUnit can be in days, weeks, months and year");
            throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.periodUnit");
          }
        } else {
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
    if (!repeat.frequency || !repeat.period || !repeat.periodUnit) {
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
    for (const date of eventArray) {
      if (limitEvents && moment(start).isSameOrBefore(date) && moment(end).isSameOrAfter(date)) {
        events.push(date);
      } else if (!limitEvents) {
        events.push(date);
      }
    }
    log.info("Exiting TimingEventsGenerator.generateSDTEvents()");
    return events;
  }

  /**
   * Generated SID events
   * @param startDate
   * @param endDate
   * @param repeat
   * @returns events
   */
  public static generateSIDEvents(startDate, endDate, repeat: any) {
    log.info("Entering TimingEventsGenerator.generateSIDEvents()");
    const events = [];
    const startDt = startDate;
    endDate = TimingUtility.formatEndDate(endDate);
    const offset = moment.parseZone(startDate).utcOffset();
    const unit = config.unitsMap[repeat.periodUnit];
    // for each time in the timeOfDay array generate dates for given period
    for (const time of repeat.timeOfDay) {
      let count = 0;
      let date = startDt;
      while (moment(date).isSameOrBefore(endDate)) {
        date = TimingUtility.generateDate(startDt, time, "", repeat.period, unit, Constants.DAY, "", Constants.DATE_TIME, count, offset);
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
   * @param repeat
   * @returns events
   */
  public static generateSDCEvents(startDate, endDate, repeat) {
    log.info("Entering TimingEventsGenerator.generateSDCEvents()");
    let nextDay;
    const events = [];
    endDate = TimingUtility.formatEndDate(endDate);
    const offset = moment.parseZone(startDate).utcOffset();
    // map FHIR unit to standard unit
    const durationUnit = config.unitsMap[repeat.durationUnit];
    for (const time of repeat.timeOfDay) {
      // format start date and set timeOfDay
      let start = TimingUtility.generateDate(startDate, time, "", "", "", Constants.DAY, "", Constants.DATE_TIME, 0, offset);
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
            nextDay = TimingUtility.generateDate(start, "", "", cycleDay.valueOf() - 1, Constants.DAYS, "", "", Constants.DATE_TIME, 1, offset);
            if (moment(nextDay).isSameOrAfter(endDate)) {
              shouldContinue = false;
              break;
            }
            events.push(nextDay);
          }
          /* if cycleDay is last day from dayOfCycle array then calculate the end date of cycle
             and no of days remaining days of the cycle*/
          if (cycleDay.valueOf() === repeat.dayOfCycle[repeat.dayOfCycle.length - 1]) {
            const cycleEndDate = TimingUtility.generateDate(start, "", "", repeat.duration, durationUnit, "", "", Constants.DATE_TIME, 1, offset);
            const remainingDays = moment(cycleEndDate).diff(nextDay, Constants.DAYS);
            nextDay = TimingUtility.generateDate(start, "", "", cycleDay + remainingDays, Constants.DAYS, "", "", Constants.DATE_TIME, 1, offset);
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
    endDate = TimingUtility.formatEndDate(endDate);
    const offset = moment.parseZone(startDate).utcOffset();
    const unit = config.unitsMap[repeat.periodUnit];
    // const unit = config.unitsMap[repeat.periodUnit]; // map FHIR unit to standard unit
    // set timeOfDay to every day from dayOfWeek array
    for (const time of repeat.timeOfDay) {
      let count = 0;
      let date = startDt;
      while (moment(date).isSameOrBefore(endDate)) {
        date = TimingUtility.generateDate(startDt, time, "", repeat.period, unit, Constants.DAY, "", Constants.DATE_TIME, count, offset);
        // this check is for date with only date and time as moment adds Z
        const day = this.getDayOfWeek(date, offset);
        // check if generated date's day is given dayOfWeek array
        if (repeat.dayOfWeek.includes(day)) {
          // check if generated date falls within start and end date range
          if (moment(startDate).isSameOrBefore(date) && moment(endDate).isSameOrAfter(date)) {
            events.push(date);
          }
        }
        count++;
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
    endDate = TimingUtility.formatEndDate(endDate);
    const offset = moment.parseZone(startDate).utcOffset();
    for (const time of repeat.timeOfDay) {
      let count = 0;
      let date = startDt;
      while (moment(date).isSameOrBefore(endDate)) {
        date = TimingUtility.generateDate(startDt, time, "", 1, Constants.DAYS, Constants.DAY, "", Constants.DATE_TIME, count, offset);
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
    if (repeat.dayOfWeek) {
      log.info("Generate events based on dayOfWeek");
      events = this.generateEventsBasedOnDayOfWeek(start, end, repeat);
    } else if (repeat.dayOfCycle) {
      log.info("Generate events based on dayOfCycle");
      events = this.generateEventsBasedOnDayOfCycle(start, end, repeat);
    } else if (repeat.period && repeat.periodUnit) {
      log.info("Generate events based on period and periodUnit");
      events = this.generateEventsBasedOnPeriod(start, end, repeat);
    }
    log.info("Exiting TimingEventsGenerator.generateCustomEvents()");
    return events;
  }

  /**
   * Generate events based on dayOfWeek, frequency, period and periodUnit
   * @param startDate
   * @param endDate
   * @param repeat
   * @returns events
   */
  public static generateEventsBasedOnDayOfWeek(startDate, endDate, repeat) {
    log.info("Entering TimingEventsGenerator.generateEventsBasedOnDayOfWeek()");
    const events = [];
    const start = startDate;
    endDate = TimingUtility.formatEndDate(endDate);
    const offset = moment.parseZone(start).utcOffset();
    const unit = config.unitsMap[repeat.periodUnit];
    const dateFormat =
      Constants.ALLOWED_UNITS.includes(repeat.periodUnit) || moment(start, Constants.DATE_TIME, true).isValid() ? Constants.DATE_TIME : Constants.DATE;
    let count = 0;
    let date = start;
    while (moment(date).isSameOrBefore(endDate)) {
      for (let frequency = 0; frequency < repeat.frequency; frequency++) {
        date = TimingUtility.generateDate(start, "", "", repeat.period, unit, "", "", dateFormat, count, offset);
        const day = this.getDayOfWeek(date, offset);
        // check if generated date's day is given dayOfWeek array
        if (repeat.dayOfWeek.includes(day)) {
          // check if generated date falls within start and end date range
          if (moment(startDate).isSameOrBefore(date) && moment(endDate).isSameOrAfter(date)) {
            events.push(date);
          }
        }
      }
      count++;
    }
    log.info("Exiting TimingEventsGenerator.generateEventsBasedOnDayOfWeek()");
    return events;
  }

  /**
   * Generate dayOfWeek from given date
   * @param date
   * @param offset
   * @returns day
   */
  public static getDayOfWeek(date, offset) {
    log.info("Entering TimingEventsGenerator.getDayOfWeek()");
    // this check is for date with only date and time as moment adds Z
    const day = moment
      .utc(date)
      .utcOffset(offset)
      .format("ddd")
      .toLowerCase();
    return day;
    log.info("Exiting TimingEventsGenerator.getDayOfWeek()");
  }
  /**
   * Generates events based on dayOfCycle, frequency, period and periodUnit
   * @param start
   * @param end
   * @param repeat
   * @returns events
   */
  public static generateEventsBasedOnDayOfCycle(start, end, repeat) {
    log.info("Entering TimingEventsGenerator.generateEventsBasedOnDayOfCycle()");
    let events: string[] = [];
    let timeOfDayForDayOne = [];
    let timeOfDayForOtherDay = [];
    let startDateTime = start;
    const offset = moment.parseZone(start).utcOffset();
    const endDateTime = TimingUtility.generateDate(start, "", "", "", "", "", Constants.DAY, Constants.DATE_TIME, 0, offset);
    if (repeat.dayOfCycle.includes(1)) {
      // generate timeOfDay for day one of cycle
      timeOfDayForDayOne = this.getTimeOfDayArray(startDateTime, endDateTime, repeat);
      log.info("timeOfDayForDayOne: " + timeOfDayForDayOne);
    }
    // generate timeOfDay for other days of cycle. Here day will start from 12 AM
    startDateTime = TimingUtility.generateDate(start, "", "", "", "", Constants.DAY, "", Constants.DATE_TIME, 0, offset);
    timeOfDayForOtherDay = this.getTimeOfDayArray(startDateTime, endDateTime, repeat);
    log.info("timeOfDayForOtherDays: " + timeOfDayForOtherDay);

    const dayOfCycle = repeat.dayOfCycle;
    // generate events for 1st day of cycle by sending dayOfCycle as [1] if dayOfCycle has 1 in it
    if (timeOfDayForDayOne.length > 0) {
      repeat.dayOfCycle = dayOfCycle.splice(0, 1);
      repeat.timeOfDay = timeOfDayForDayOne;
      const dates: string[] = this.generateSDCEvents(start, end, repeat);
      events = events.concat(dates);
    }
    // generate events for other cycle days by sending dayOfCycle. Here we remove 1st day from dayOfCycle
    if (timeOfDayForOtherDay.length > 0) {
      repeat.dayOfCycle = dayOfCycle;
      repeat.timeOfDay = timeOfDayForOtherDay;
      const dates: string[] = this.generateSDCEvents(start, end, repeat);
      events = events.concat(dates);
    }
    log.info("Exiting TimingEventsGenerator.generateEventsBasedOnDayOfCycle()");
    return events;
  }

  /**
   * Generate timeOfDay array based on frequency, period and periodUnit
   * @param cycleDayStartDateTime
   * @param cycleDayEndDateTime
   * @param repeat
   * @returns events
   */
  public static getTimeOfDayArray(cycleDayStartDateTime, cycleDayEndDateTime, repeat) {
    const timeOfDay = [];
    const offset = moment.parseZone(cycleDayStartDateTime).utcOffset();
    let dateTime = cycleDayStartDateTime;
    let count = 0;
    while (moment(dateTime).isSameOrBefore(cycleDayEndDateTime)) {
      // add period to the date and check if generated time is less than the end of the day. If so then add time to the array.
      dateTime = TimingUtility.generateDate(cycleDayStartDateTime, "", "", repeat.period, repeat.periodUnit, "", "", Constants.DATE_TIME, count++, offset);
      // check if generated dateTime falls with cycleDayStartDateTime and cycleDayEndDateTime
      if (moment(cycleDayStartDateTime).isSameOrBefore(dateTime) && moment(cycleDayEndDateTime).isSameOrAfter(dateTime)) {
        let time;
        // if dateTime contains only date and time then format date according to that only
        if (moment(dateTime, Constants.DATE_TIME_ONLY, true).isValid()) {
          time = moment
            .utc(dateTime)
            .utcOffset(offset)
            .format("HH:mm:ss");
        } else {
          time = moment(dateTime)
            .utcOffset(offset)
            .format("HH:mm:ss");
        }
        // repeat frequency times
        for (let frequency = 0; frequency < repeat.frequency; frequency++) {
          timeOfDay.push(time);
        }
      }
    }
    return timeOfDay;
  }

  /**
   * Generate events based on frequency, period and periodUnit
   * @param start
   * @param end
   * @param repeat
   * @returns events
   */
  public static generateEventsBasedOnPeriod(start, end, repeat) {
    log.info("Entering TimingEventsGenerator.generateEventsBasedOnPeriod()");
    const events = [];
    end = TimingUtility.formatEndDate(end);
    const offset = moment.parseZone(start).utcOffset();
    const unit = config.unitsMap[repeat.periodUnit];
    const dateFormat =
      Constants.ALLOWED_UNITS.includes(repeat.periodUnit) || moment(start, Constants.DATE_TIME, true).isValid() ? Constants.DATE_TIME : Constants.DATE;
    // for each time in the timeOfDay array generate dates for given period
    let count = 0;
    let date = start;
    while (moment(date).isSameOrBefore(end)) {
      for (let frequency = 0; frequency < repeat.frequency; frequency++) {
        date = TimingUtility.generateDate(start, "", "", repeat.period, unit, "", "", dateFormat, count, offset);
        if (moment(start).isSameOrBefore(date) && moment(end).isSameOrAfter(date)) {
          events.push(date);
        }
      }
      count++;
    }
    log.info("Exiting TimingEventsGenerator.generateEventsBasedOnPeriod()");
    return events;
  }
}
