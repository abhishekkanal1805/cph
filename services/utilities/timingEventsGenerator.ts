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
        startDate = TimingUtility.calculateStartDate(startDate, timing.repeat, endDate);
        endDate = TimingUtility.calculateEndDate(startDate, endDate, timing.repeat, timing.code.coding[0].code);
        if (startDate && endDate) {
          TimingValidator.validateStartEndDates(startDate, endDate);
        }
        events = TimingEventsGenerator.generateEventsFromCode(startDate, endDate, timing);
      }
      // events = TimingEventsGenerator.filterEvents(events, startDate, endDate, typeof timing.event);
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
    } else if (repeat.timeOfDay) {
      code = "SDY";
    } else if (repeat.period && repeat.periodUnit) {
      code = "SID";
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
   * This function filters generated events
   * @param events
   * @param startDate
   * @param endDate
   * @param typeOfTiming
   * @returns  events array
   */
  /*public static filterEvents(events: any, startDate: string, endDate: string, typeOfTiming: string) {
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
    if (typeOfTiming === "undefined") {
      events = _.filter(events, (date) => {
        if (moment(startDate, Constants.DATE, true).isValid() && moment(endDate, Constants.DATE, true).isValid()) {
          return date;
        }
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
  }*/

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
    const startDt = this.formatStartDate(startDate);
    endDate = this.formatEndDate(endDate);
    // for each time in the timeOfDay array generate dates for given period
    for (const time of repeat.timeOfDay) {
      let count = 0;
      let date = startDt;
      while (moment(date).isSameOrBefore(endDate)) {
        const unit = config.unitsMap[repeat.periodUnit];
        date = moment
          .utc(startDt, Constants.DATE_TIME)
          .add(unit, count * repeat.period) // add period given in request
          .add(moment.duration(time)) // set timeOfDay
          .toISOString();
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
    // map FHIR unit to standard unit
    const durationUnit = config.unitsMap[repeat.durationUnit];
    for (const time of repeat.timeOfDay) {
      // format start date and set timeOfDay
      let start = moment
        .utc(startDate, Constants.DATE_TIME)
        .startOf("day")
        .add(moment.duration(time))
        .toISOString();
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
            nextDay = moment
              .utc(start, Constants.DATE_TIME)
              .add(Constants.DAYS, cycleDay.valueOf() - 1)
              .toISOString();
            if (moment(nextDay).isSameOrAfter(endDate)) {
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
  public static generateSDWEvents(startDate, endDate, repeat) {
    log.info("Entering TimingEventsGenerator.generateSDWEvents()");
    // code says Specific times on specify days in a week
    const events = [];
    const startDt = moment.utc(startDate, Constants.DATE).startOf("day");
    endDate = this.formatEndDate(endDate);
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
            date = moment
              .utc(startDt, Constants.DATE_TIME)
              .add(count * period, periodUnit) // add period
              .add(moment.duration(time)) // set timeOfDay
              .day(day);
            log.info("Date: " + date.toISOString());
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
    const startDt = moment.utc(startDate, Constants.DATE).startOf("day");
    endDate = this.formatEndDate(endDate);
    for (const time of repeat.timeOfDay) {
      let count = 0;
      let date = startDt;
      while (moment(date).isSameOrBefore(endDate)) {
        date = moment
          .utc(startDt, Constants.DATE_TIME)
          .add(count * 1, Constants.DAYS) // add period which will be always 1 for SDY
          .add(moment.duration(time)); // set timeOfDay
        // check if generated date falls within start and end date range
        log.info("Date: " + date.toISOString());
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
    start = this.formatStartDate(start);
    end = this.formatEndDate(end);
    const unit = config.unitsMap[repeat.periodUnit];
    const dateFormat =
      Constants.ALLOWED_UNITS.includes(repeat.periodUnit) || moment(start, Constants.DATE_TIME, true).isValid() ? Constants.DATE_TIME : Constants.DATE;
    // for each time in the timeOfDay array generate dates for given period
    let count = 0;
    let date = start;
    while (moment(date).isSameOrBefore(end)) {
      for (let frequency = 0; frequency < repeat.frequency; frequency++) {
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
   * Generate events based on period and periodUnit
   * @param start
   * @param end
   * @param repeat
   * @returns events
   */
  public static generateEventsBasedOnDayOfWeek(startDate, endDate, repeat) {
    log.info("Entering TimingEventsGenerator.generateEventsBasedOnDayOfWeek()");
    const events = [];
    const start = this.formatStartDate(startDate);
    endDate = this.formatEndDate(endDate);
    log.info("Start: " + start.toISOString());
    log.info("End: " + endDate.toISOString());
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
          date = moment
            .utc(start, Constants.DATE)
            .add(count * period, periodUnit)
            .day(day)
            .toISOString();
          const dayEndTime = moment
            .utc(date, Constants.DATE)
            .day(day)
            .endOf("day")
            .toISOString();
          log.info("DayTime: " + date);
          log.info("dayEndTime: " + dayEndTime);
          for (let frequency = 0; frequency < repeat.frequency; frequency++) {
            date = moment
              .utc(date, dateFormat)
              .add(unit, frequency * repeat.period) // add period
              .toISOString();
            log.info("Date: " + date);
            // check if generated date falls within start and end date range
            if (moment(date).isSameOrBefore(dayEndTime) && moment(startDate).isSameOrBefore(date) && moment(endDate).isSameOrAfter(date)) {
              events.push(date);
            }
          }
        } else {
          for (let frequency = 0; frequency < repeat.frequency; frequency++) {
            date = moment
              .utc(start, Constants.DATE_TIME)
              .add(unit, count * repeat.period) // add period
              .toISOString();
            log.info("DayTime: " + date);
            // check if generated date falls within start and end date range
            if ( moment(date).format("ddd").toLowerCase() == day) {
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
