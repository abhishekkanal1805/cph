/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import * as moment from "moment";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
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
    let count;
    // timing element is mandatory
    if (timing) {
      count = timing.repeat && timing.repeat.count ? timing.repeat.count : 0;
      // if found EVENT array, ignore everything else and use the dates specified there
      if (timing.event) {
        startDate = start;
        endDate = end
          ? end
          : moment
            .utc(startDate)
            .add(365, "d")
            .toISOString();
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
        startDate = TimingUtility.calculateStartDate(start, timing.repeat, end);
        endDate = TimingUtility.calculateEndDate(startDate, end, timing.repeat, timing.code.coding[0].code);
        if (startDate && endDate) {
          TimingValidator.validateStartEndDates(startDate, endDate);
        }
        events = TimingEventsGenerator.generateEventsFromCode(startDate, endDate, timing);
        if (events.length > 0 && count > 0) {
          events = events.slice(0, count);
        }
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
    } else if (repeat.period) {
      code = "SID";
    } else if (repeat.timeOfDay) {
      code = "SDY";
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
        } else {
          log.info("SDY:generateSDYEvents with: " + startDate + ", " + endDate + ", " + repeat.timeOfDay);
          events = this.generateSDYEvents(startDate, endDate, repeat.timeOfDay);
        }
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
        log.info("SDW:generateSDWEvents with: " + startDate + ", " + endDate + ", " + repeat.dayOfWeek + ", " + repeat.timeOfDay);
        events = this.generateSDWEvents(startDate, endDate, repeat.dayOfWeek, repeat.timeOfDay);
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
        if (repeat.durationUnit != "d") {
          log.error("repeat.durationUnit is not present in days");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.durationUnit");
        }

        if (repeat.duration < repeat.dayOfCycle.length) {
          log.error("duration is less than dayOfCycle.length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.dayOfCycle");
        }
        log.info("SDC:generateCycleEvents with: " + startDate + ", " + endDate + ", " + repeat.dayOfCycle + ", " + repeat.timeOfDay + ", " + repeat.duration);

        events = this.generateSDCEvents(startDate, endDate, repeat.dayOfCycle, repeat.timeOfDay, repeat.duration);

        break;

      case "SID":
        if (!repeat.timeOfDay || !Array.isArray(repeat.timeOfDay) || repeat.timeOfDay.length == 0 || !TimingValidator.validateTime(repeat.timeOfDay)) {
          log.error("timeOfDay is not present or not an array or of 0 length");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.timeOfDay");
        }
        log.info("SID:generateSIDEvents with: " + startDate + ", " + endDate);
        if (!repeat.period) {
          log.error("repeat.period is not present ");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "Period");
        }
        if (repeat.periodUnit != "d") {
          log.error("repeat.periodUnit is not present in days");
          throw new BadRequestResult(errorCodeMap.InvalidElementValue.value, errorCodeMap.InvalidElementValue.description + "repeat.periodUnit");
        }
        events = this.generateSIDEvents(startDate, endDate, repeat.period, repeat.timeOfDay);
        break;

      case "Custom":
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
  public static generateSIDEvents(start, end, period: any, timeOfDay) {
    log.info("Entering TimingEventsGenerator.generateSIDEvents()");
    const dayOfCycle = TimingUtility.convertPeriodIntervalToCycle(start, end, period);
    const events = [];
    let prevDay = 0;
    start = moment.utc(start).format(Constants.DATE);
    // for each time in the array
    for (const time of timeOfDay) {
      // for each cycle of days
      for (const cycleDay of dayOfCycle) {
        const currentDate = new Date(new Date(start + " " + time + " UTC").toISOString()); // new Date(start);
        currentDate.setDate(currentDate.getDate() + (cycleDay - prevDay));
        events.push(currentDate);
        start = currentDate.toISOString();
        start = moment.utc(start).format(Constants.DATE);
        prevDay = cycleDay;
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
  public static generateSDCEvents(start, end, dayOfCycle, timeOfDay, duration) {
    log.info("Entering TimingEventsGenerator.generateSDCEvents()");
    let nextDay;
    const events = [];
    const startDate = moment.utc(start).format(Constants.DATE);
    const endDate = moment.utc(end).format(Constants.DATE);
    for (const time of timeOfDay) {
      start = new Date(new Date(startDate + " " + time + " UTC").toISOString());
      end = new Date(new Date(endDate + " " + time + " UTC").toISOString());
      nextDay = start;
      let shouldContinue = true;
      while (shouldContinue) {
        for (const cycleDay of dayOfCycle) {
          if (cycleDay === 1) {
            events.push(start);
          } else {
            nextDay = TimingUtility.addDays(start, cycleDay.valueOf() - 1);
            if (nextDay > end) {
              shouldContinue = false;
              break;
            }
            events.push(nextDay);
          }
          if (cycleDay.valueOf() === dayOfCycle[dayOfCycle.length - 1]) {
            const gap = duration - cycleDay;
            nextDay = TimingUtility.addDays(start, cycleDay + gap);
            if (nextDay > end) {
              shouldContinue = false;
              break;
            }
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
  public static generateSDWEvents(start, end, dayOfWeek, timeOfDay) {
    log.info("Entering TimingEventsGenerator.generateSDWEvents()");
    // get the end date by adding 365 days fro the start
    const events = [];
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dates: any = this.generateSDYEvents(start, end, timeOfDay);
    for (const date of dates) {
      if (dayOfWeek.indexOf(days[date.getUTCDay()]) >= 0) {
        events.push(date);
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
  public static generateSDYEvents(start, end, timeOfDay) {
    log.info("Entering TimingEventsGenerator.generateSDYEvents()");
    const events = [];
    start = moment.utc(start).format(Constants.DATE);
    end = moment.utc(end).format(Constants.DATE);
    for (const time of timeOfDay) {
      const dates = TimingUtility.getDates(
        new Date(new Date(start + " " + time + " UTC").toISOString()),
        new Date(new Date(end + " " + time + " UTC").toISOString())
      );
      for (const date of dates) {
        events.push(date);
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
    log.info("Entering TimingEventsGenerator.generateSDYEvents()");
    const events = [];
    start = moment.utc(start).format(Constants.DATE);
    end = moment.utc(end).format(Constants.DATE);
    for (const time of repeat.timeOfDay) {
      const dates = TimingUtility.getDates(
        new Date(new Date(start + " " + time + " UTC").toISOString()),
        new Date(new Date(end + " " + time + " UTC").toISOString())
      );
      for (const date of dates) {
        events.push(date);
      }
    }
    log.info("Exiting TimingEventsGenerator.generateSDYEvents()");
    return events;
  }

}
