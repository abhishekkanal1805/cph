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
  public static generateDateEventsFromTiming(timing: any, start: string, end: string) {
    log.info("Entering TimingEventsGenerator.generateDateEventsFromTiming()");
    let events: any = [];
    let startDate: any;
    let endDate: any;
    // timing element is mandatory
    if (timing) {
      startDate = start ? start : moment.utc(new Date(), Constants.DATE_TIME).startOf("day");
      endDate = end
        ? end
        : moment
            .utc(startDate, Constants.DATE_TIME)
            .endOf("day")
            .add(365, "d");
      // if found EVENT array, ignore everything else and use the dates specified there
      if (timing.event) {
        log.info("timing  event object found. Generating events using event object");
        if (Array.isArray(timing.event) && timing.event.length != 0) {
          log.info("EVENT:generateSDTEvents with: " + timing.event);
          events = TimingEventsGenerator.generateSDTEvents(timing.event, startDate, endDate, true);
          endDate = events[events.length - 1];
        } else {
          log.error("timing.event is not an array or empty");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "timing.event");
        }
      } else {
        if (!(timing.code && timing.code.coding && timing.code.coding[0] && timing.code.coding[0].code)) {
          timing = TimingEventsGenerator.generateCode(timing);
        }
        log.info("Code: " + timing.code.coding[0].code + " was specified.");
        startDate = TimingUtility.calculateStartDate(startDate, timing.repeat, endDate);
        endDate = TimingUtility.calculateEndDate(startDate, endDate, timing.repeat, timing.code.coding[0].code);
        if (startDate && endDate) {
          TimingValidator.validateStartEndDates(startDate, endDate);
        }
        events = TimingEventsGenerator.generateEventsFromCode(startDate, endDate, timing);
      }
      events = TimingEventsGenerator.filterEvents(events, startDate, endDate, typeof timing.event);
    }
    log.info("Existing TimingEventsGenerator.generateDateEventsFromTiming()");
    return events;
  }

  /**
   * Calculates timing.code programmatically in case no code is provided
   * @param repeat
   * @returns code
   */
  public static generateProgrammaticCode(repeat) {
    log.info("Entering TimingEventsGenerator.generateProgrammaticCode () :: Generating code programmatically");
    let code;
    if (repeat.dayOfWeek && Array.isArray(repeat.dayOfWeek) && repeat.dayOfWeek.length != 0) {
      // TODO: check if period is required and periodUnit should be wk or not
      code = "SDW";
    } else if (
      repeat.dayOfCycle &&
      Array.isArray(repeat.dayOfCycle) &&
      repeat.dayOfCycle.length != 0 &&
      TimingValidator.validateNumberValue(repeat.dayOfCycle) &&
      repeat.duration &&
      TimingValidator.validateNumberValue(repeat.duration) &&
      repeat.duration >= repeat.dayOfCycle.length
    ) {
      code = "SDC";
    } else if (repeat.timeOfDay && repeat.period && repeat.period == 1 && repeat.periodUnit === "d") {
      code = "SDY";
    } else if (repeat.period && ["d", "wk", "mo", "a"].includes(repeat.periodUnit)) {
      code = "SID";
    }
    log.info("Existing TimingEventsGenerator.generateProgrammaticCode()");
    return code;
  }
  /**
   * This function generate code from timing object if code is not present
   * @param timing
   * @returns  updated timing object
   */
  public static generateCode(timing: any) {
    log.info("Entering TimingEventsGenerator.generateCode()");
    const repeat = timing.repeat;
    log.info("Timing code is being programmatically generated");
    if (repeat.timeOfDay && Array.isArray(repeat.timeOfDay) && repeat.timeOfDay.length > 0 && TimingValidator.validateTime(repeat.timeOfDay)) {
      const code = TimingEventsGenerator.generateProgrammaticCode(repeat);
      _.set(timing, "code.coding[0].code", code);
    } else {
      _.set(timing, "code.coding[0].code", "Custom");
    }
    log.info("Existing TimingEventsGenerator.generateCode()");
    return timing;
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
        if (!repeat.timeOfDay || !Array.isArray(repeat.timeOfDay) || repeat.timeOfDay.length == 0 || !TimingValidator.validateTime(repeat.timeOfDay)) {
          log.error("timeOfDay is not present or not an array or of 0 length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.timeOfDay");
        }
        if (!repeat.period && !repeat.periodUnit) {
          log.error("repeat.period is not present ");
          throw new BadRequestResult(
            errorCodeMap.InvalidElementValue.value,
            errorCodeMap.InvalidElementValue.description + "repeat.period or repeat.periodUnit"
          );
        }
        log.info("SDY:generateSDYEvents with: " + startDate + ", " + endDate + ", " + repeat.timeOfDay);
        events = this.generateSDYEvents(startDate, endDate, repeat);
        break;
      case "SDW":
        if (!repeat.timeOfDay || !Array.isArray(repeat.timeOfDay) || repeat.timeOfDay.length == 0 || !TimingValidator.validateTime(repeat.timeOfDay)) {
          log.error("timeOfDay is not present or not an array or of 0 length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.timeOfDay");
        }
        if (!repeat.dayOfWeek || !Array.isArray(repeat.dayOfWeek) || repeat.dayOfWeek.length == 0) {
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
        log.info("SDW:generateSDWEvents with: " + startDate + ", " + endDate + ", " + repeat.dayOfWeek + ", " + repeat.timeOfDay);
        events = this.generateSDWEvents(startDate, endDate, repeat);
        break;

      case "SDT":
        if (!timing.event || !Array.isArray(timing.event) || timing.event.length == 0) {
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "timing.event");
        }
        log.info("SDT:generateSDTEvents with: " + timing.event);
        let limitEvents = false;
        if (startDate) {
          limitEvents = true;
        }
        events = this.generateSDTEvents(timing.event, startDate, endDate, limitEvents);
        endDate = events[events.length - 1];
        break;

      case "SDC":
        if (!repeat.timeOfDay || !Array.isArray(repeat.timeOfDay) || repeat.timeOfDay.length == 0 || !TimingValidator.validateTime(repeat.timeOfDay)) {
          log.error("timeOfDay is not present or not an array or of 0 length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.timeOfDay");
        }
        if (
          !repeat.dayOfCycle ||
          !Array.isArray(repeat.dayOfCycle) ||
          repeat.dayOfCycle.length == 0 ||
          !TimingValidator.validateNumberValue(repeat.dayOfCycle)
        ) {
          log.error("dayOfCycle is not present or not an array or of 0 length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.dayOfCycle");
        }
        if (!repeat.duration || !TimingValidator.validateNumberValue(repeat.duration)) {
          log.error("repeat.duration is not present or not a valid number");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.duration");
        }
        if (!repeat.durationUnit || ["s", "min", "h"].includes(repeat.durationUnit)) {
          log.error("repeat.durationUnit is invalid. DurationUnit can be in days, weeks, months and year");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.durationUnit");
        }

        /*if (repeat.duration < repeat.dayOfCycle.length) {
          log.error("duration is less than dayOfCycle.length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.dayOfCycle");
        }*/
        log.info("SDC:generateCycleEvents with: " + startDate + ", " + endDate + ", " + repeat.dayOfCycle + ", " + repeat.timeOfDay + ", " + repeat.duration);

        events = this.generateSDCEvents(startDate, endDate, repeat);

        break;

      case "SID":
        if (!repeat.timeOfDay || !Array.isArray(repeat.timeOfDay) || repeat.timeOfDay.length == 0 || !TimingValidator.validateTime(repeat.timeOfDay)) {
          log.error("timeOfDay is not present or not an array or of 0 length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.timeOfDay");
        }
        log.info("SID:generateSIDEvents with: " + startDate + ", " + endDate);
        if (!repeat.period && !repeat.periodUnit) {
          log.error("repeat.period is not present ");
          throw new BadRequestResult(
            errorCodeMap.InvalidElementValue.value,
            errorCodeMap.InvalidElementValue.description + "repeat.period or repeat.periodUnit"
          );
        }
        // TODO : check if we can restrict periodUnit to "h", "d", "wk", "mo" and "a"
        /*if (repeat.periodUnit != "d") {
          log.error("repeat.periodUnit is not present in days");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.periodUnit");
        }*/
        events = this.generateSIDEvents(startDate, endDate, repeat);
        break;

      case "Custom":
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
   * This function filters generated events
   * @param events
   * @param startDate
   * @param endDate
   * @param typeOfTiming
   * @returns  events array
   */
  public static filterEvents(events: any, startDate: string, endDate: string, typeOfTiming: string) {
    log.info("Entering TimingEventsGenerator.filterEvents()");
    if (events.length == 0) {
      log.info("No events created");
      return events;
    }
    if (!endDate) {
      endDate = moment
        .utc(startDate)
        .add(365, "d")
        .toISOString();
    }
    if (typeOfTiming === "undefined" && !(moment(startDate, Constants.DATE, true).isValid() && moment(endDate, Constants.DATE, true).isValid())) {
      events = _.filter(events, (date) => {
        if (
          moment(startDate, Constants.DATE_TIME, true).isValid() &&
          moment(endDate, Constants.DATE_TIME, true).isValid() &&
          startDate <= date.toISOString() &&
          endDate >= date.toISOString()
        ) {
          return date;
        }
        if (
          moment(startDate, Constants.DATE, true).isValid() &&
          moment(endDate, Constants.DATE_TIME, true).isValid() &&
          startDate <= date.toISOString() &&
          endDate >= date.toISOString()
        ) {
          return date;
        }
        if (
          moment(startDate, Constants.DATE_TIME, true).isValid() &&
          moment(endDate, Constants.DATE, true).isValid() &&
          startDate <= date.toISOString() &&
          moment
            .utc(endDate)
            .add(1, "d")
            .format(Constants.DATE)
            .toString() >= date.toISOString()
        ) {
          return date;
        }
      });
      events = events.filter((date) => date != null);
    }

    log.info("Existing TimingEventsGenerator.filterEvents()");
    return events;
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
  public static generateSIDEvents(start, end, repeat: any) {
    log.info("Entering TimingEventsGenerator.generateSIDEvents()");
    const events = [];
    start = moment.utc(start).format(Constants.DATE);
    end = this.formatEndDate(end);
    // for each time in the timeOfDay array generate dates for given period
    for (const time of repeat.timeOfDay) {
      let count = 0;
      let date = start;
      while (moment(date).isSameOrBefore(end)) {
        const unit = config.unitsMap[repeat.periodUnit];
        date = moment
          .utc(start, Constants.DATE_TIME)
          .add(unit, count * repeat.period) // add period given in request
          .add(moment.duration(time)) // set timeOfDay
          .toISOString();
        if (moment(start).isSameOrBefore(date) && moment(end).isSameOrAfter(date)) {
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
    // map FHIR unit to standard unit
    const durationUnit = config.unitsMap[repeat.durationUnit];
    for (const time of repeat.timeOfDay) {
      // format start date and set timeOfDay
      let start = moment
        .utc(startDate, Constants.DATE_TIME)
        .add(moment.duration(time))
        .toISOString();
      // format start date and set timeOfDay
      const end = this.formatEndDate(endDate);
      nextDay = start;
      let shouldContinue = true;
      while (shouldContinue) {
        for (const cycleDay of repeat.dayOfCycle) {
          // if cycleOfDay is one then insert startDate into events array
          if (cycleDay === 1) {
            events.push(start);
          } else {
            // generate date using dayOfCycle
            nextDay = moment
              .utc(start, Constants.DATE_TIME)
              .add(Constants.DAYS, cycleDay.valueOf() - 1)
              .toISOString();
            if (moment(nextDay).isSameOrAfter(end)) {
              shouldContinue = false;
              break;
            }
            events.push(nextDay);
          }
          /* if cycleDay is last day from dayOfCycle array then calculate the end date of cycle
             and no of days remaining days of the cycle*/
          if (cycleDay.valueOf() === repeat.dayOfCycle[repeat.dayOfCycle.length - 1]) {
            const cycleEndDate = moment.utc(start, Constants.DATE).add(durationUnit, repeat.duration);
            const remainingDays = cycleEndDate.diff(nextDay, Constants.DAYS);
            nextDay = moment
              .utc(start, Constants.DATE_TIME)
              .add(cycleDay + remainingDays, Constants.DAYS)
              .toISOString();
            if (moment(nextDay).isSameOrAfter(end)) {
              shouldContinue = false;
              break;
            }
            // after completion of one cycle update the start date for next cycle
            start = nextDay;
          }
        }
      }
    }
    log.info("Entering TimingEventsGenerator.generateSDCEvents()");
    return events;
  }

  /**
   * Generated SDW events
   * @param start
   * @param end
   * @param dayOfWeek
   * @param timeOfDay
   */
  public static generateSDWEvents(start, end, repeat) {
    log.info("Entering TimingEventsGenerator.generateSDWEvents()");
    // code says Specific times on specify days in a week
    const events = [];
    start = moment.utc(start).format(Constants.DATE);
    end = this.formatEndDate(end);
    const unit = config.unitsMap[repeat.periodUnit]; // map FHIR unit to standard unit
    if (
      ([1, 7].includes(repeat.period) && repeat.periodUnit == Constants.FHIR_DAY_UNIT) ||
      [Constants.FHIR_DAY_UNIT, Constants.FHIR_WEEK_UNIT, Constants.FHIR_MONTH_UNIT, Constants.FHIR_YEAR_UNIT].includes(repeat.periodUnit)
    ) {
      // set timeOfDay to every day from dayOfWeek array
      for (const time of repeat.timeOfDay) {
        for (const day of repeat.dayOfWeek) {
          let count = 0;
          let date = start;
          while (moment(date).isSameOrBefore(end)) {
            date = moment
              .utc(start, Constants.DATE_TIME)
              .add(unit, count * repeat.period) // add period
              .add(moment.duration(time)) // set timeOfDay
              .day(day)
              .toISOString();
            // check if generated date falls within start and end date range
            if (moment(start).isSameOrBefore(date) && moment(end).isSameOrAfter(date)) {
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
  public static generateSDYEvents(start, end, repeat) {
    log.info("Entering TimingEventsGenerator.generateSDYEvents()");
    const events = [];
    start = moment.utc(start).format(Constants.DATE);
    end = this.formatEndDate(end);
    let date = start;
    for (const time of repeat.timeOfDay) {
      let count = 0;
      while (moment(date).isSameOrBefore(end)) {
        const unit = config.unitsMap[repeat.periodUnit]; // map FHIR unit to standard unit
        date = moment
          .utc(start, Constants.DATE_TIME)
          .add(unit, count * repeat.period) // add period which will be always 1 for SDY
          .add(moment.duration(time)) // set timeOfDay
          .toISOString();
        // check if generated date falls within start and end date range
        if (moment(start).isSameOrBefore(date) && moment(end).isSameOrAfter(date)) {
          events.push(date);
        }
        count++;
      }
    }
    log.info("Exiting TimingEventsGenerator.generateSDYEvents()");
    return events;
  }

  /**
   * Format start date
   * @param startDate
   * @returns startDate
   */
  public static formatStartDate(startDate) {
    if (moment(startDate, Constants.DATE, true).isValid()) {
      startDate = moment.utc(startDate, Constants.DATE);
    } else {
      startDate = moment.utc(startDate, Constants.DATE_TIME);
    }
    return startDate;
  }

  /**
   * Format end date
   * @param endDate
   * @returns endDate
   */
  public static formatEndDate(endDate) {
    if (moment(endDate, Constants.DATE, true).isValid()) {
      endDate = moment.utc(endDate, Constants.DATE_TIME).endOf("day");
    } else {
      endDate = moment.utc(endDate, Constants.DATE_TIME);
    }
    return endDate;
  }

  /**
   * Generated Custom events
   * @param start
   * @param end
   * @param repeat
   * @returns events
   */
  public static generateCustomEvents(start, end, repeat) {
    log.info("Entering TimingEventsGenerator.generateSDYEvents()");
    let events = [];
    if (repeat.dayOfWeek && Array.isArray(repeat.dayOfWeek) && repeat.dayOfWeek.length != 0) {
      log.info("Generate events based on dayOfWeek");
    } else if (
      repeat.dayOfCycle &&
      Array.isArray(repeat.dayOfCycle) &&
      repeat.dayOfCycle.length != 0 &&
      TimingValidator.validateNumberValue(repeat.dayOfCycle) &&
      repeat.duration &&
      TimingValidator.validateNumberValue(repeat.duration) &&
      repeat.duration >= repeat.dayOfCycle.length
    ) {
      log.info("Generate events based on dayOfCycle");
    } else if (repeat.period && repeat.periodUnit) {
      events = this.generateEventsBasedOnPeriod(start, end, repeat);
    }
    log.info("Exiting TimingEventsGenerator.generateSDYEvents()");
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
    start = this.formatStartDate(start);
    end = this.formatEndDate(end);
    log.info("Start: " + start.toISOString());
    log.info("End: " + end.toISOString());
    const unit = config.unitsMap[repeat.periodUnit];
    const dateFormat =
      ["s", "min", "h"].includes(repeat.periodUnit) || moment(start, Constants.DATE_TIME, true).isValid() ? Constants.DATE_TIME : Constants.DATE;
    // for each time in the timeOfDay array generate dates for given period
    let count = 0;
    let date = start;
    while (moment(date).isSameOrBefore(end)) {
      if (repeat.frequency && repeat.period && repeat.periodUnit) {
        for (let frequency = 0; frequency < repeat.frequency; frequency++) {
          date = this.generateDate(start, end, unit, repeat.period, dateFormat, count);
          if (date) {
            events.push(date);
          }
        }
      } else {
        date = this.generateDate(start, end, unit, repeat.period, dateFormat, count);
        if (date) {
          events.push(date);
        }
      }
      count++;
    }
    log.info("Exiting TimingEventsGenerator.generateEventsBasedOnPeriod()");
    return events;
  }

  /**
   * Generated Date
   * @param start
   * @param end
   * @param periodUnit
   * @param period
   * @param dateFormat
   * @param count
   * @returns date
   */
  public static generateDate(start, end, periodUnit, period, dateFormat, count) {
    const date = moment
      .utc(start, dateFormat)
      .add(periodUnit, count * period) // add period given in request
      .toISOString();
    log.info("Date : " + date);
    if (moment(start).isSameOrBefore(date) && moment(end).isSameOrAfter(date)) {
      return date;
    }
    return null;
  }
}
