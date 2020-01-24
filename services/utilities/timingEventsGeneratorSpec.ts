/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import * as log from "lambda-log";
import { TimingEventsGenerator } from "./timingEventsGenerator";

describe("TimingEventsGenerator", () => {
  /*describe("#generateSIDEvents()", () => {
    it("generate events based on cycle", async (done) => {
      const repeat = {
        count: 4,
        timeOfDay: ["08:10:00"],
        period: 1,
        periodUnit: "mo"
      };
      const events = TimingEventsGenerator.generateSIDEvents("2020-01-08", "2020-05-05", repeat);
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(5);
      done();
    });
  });*/

  /*describe("#generateSDYEvents()", () => {
    it("generate events daily", async (done) => {
      const repeat = {
        count: 5,
        timeOfDay: ["08:10:00", "12:10:00"],
        period: 1,
        periodUnit: "d"
      };
      const events = TimingEventsGenerator.generateSDYEvents("2020-01-13T07:00:00", "2020-01-17T07:00:00", repeat);
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(5);
      done();
    });
  });*/

  /*describe("#generateSDWEvents()", () => {
    it("generate events weekly", async (done) => {
      const repeat = {
        count: 3,
        timeOfDay: ["08:10:00", "12:10:00"],
        period: 1,
        dayOfWeek: ["mon", "fri", "sat"],
        periodUnit: "d"
      };
      const events = TimingEventsGenerator.generateSDWEvents("2020-01-13", "2020-01-16", repeat);
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(1);
      done();
    });
  });*/

  /*describe("#generateDateEventsFromTiming()", () => {
    it("generate events", async (done) => {
      const timing = {
        repeat: {
          frequency: 4,
          period: 1,
          periodUnit: "d",
          dayOfCycle: [1],
          timeOfDay: ["02:00:00", "08:00:00", "14:00:00", "16:00:00"],
          dayOfWeek: [],
          boundsPeriod: {
            start: "2020-01-14T12:00:00.000Z",
            end: "2020-01-15T23:59:59.000Z"
          }
        },
        code: {
          coding: [
            {
              code: "SDY"
            }
          ]
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-01-14T12:00:00.000Z", "2020-01-15T23:59:59.000Z");
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(5);
      done();
    });
  });*/

  /*describe("#generateEventsBasedOnPeriod()", () => {
    it("generate events", async (done) => {
      const timing = {
        repeat: {
          frequency: 1,
          period: 5,
          periodUnit: "h"
        }
      };
      const events = TimingEventsGenerator.generateEventsBasedOnPeriod("2020-01-17T10:00:00.000Z", "2020-01-18T10:00:00", timing.repeat);
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(5);
      done();
    });
  });*/

  describe("#generateDateEventsFromTiming()", () => {
    it("generate events", async (done) => {
      const timing = {
        repeat: {
          frequency: 1,
          period: 8,
          periodUnit: "h",
          dayOfWeek: ["wed", "fri"]
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-01-22T12:00:00.000Z", "2020-02-22T23:59:59.000Z");
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(1);
      done();
    });
  });
});
