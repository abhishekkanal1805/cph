/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import * as log from "lambda-log";
import { TimingEventsGenerator } from "./timingEventsGenerator";

describe("TimingEventsGenerator", () => {
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events based on SID", async (done) => {
      const timing = {
        repeat: {
          count: 5,
          timeOfDay: ["08:10:00"],
          period: 1,
          periodUnit: "mo",
          boundsPeriod: {
            start: "2020-01-28T00:00:00.000+02:00",
            end: "2020-04-28T00:00:00.000+02:00"
          }
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-01-28T12:00:00.000+02:00", "2021-01-28T12:00:00.000+02:00");
      expect(events.length).toBeGreaterThan(1);
      done();
    });
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events daily", async (done) => {
      const timing = {
        repeat: {
          count: 5,
          timeOfDay: ["08:10:00", "12:10:00"],
          period: 1,
          periodUnit: "d"
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-01-29", "2020-06-29");
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(5);
      done();
    });
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events weekly", async (done) => {
      const timing = {
        repeat: {
          count: 3,
          timeOfDay: ["08:10:00", "12:10:00"],
          period: 1,
          dayOfWeek: ["mon", "tue"],
          periodUnit: "d"
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-01-28T07:00:00.000Z", "2020-02-18T07:00:00.000Z");
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(1);
      done();
    });
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events based on SDC", async (done) => {
      const timing = {
        repeat: {
          frequency: 4,
          period: 1,
          periodUnit: "d",
          dayOfCycle: [1],
          timeOfDay: ["02:00:00", "08:00:00", "14:00:00", "16:00:00"],
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
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events based on SDC", async (done) => {
      const timing = {
        code: {
          text: "Code For SDC",
          coding: [
            {
              code: "SDC"
            }
          ]
        },
        repeat: {
          count: 1,
          duration: 28,
          durationUnit: "d",
          timeOfDay: ["08:00:00", "22:00:00"],
          dayOfCycle: [1, 2, 3, 4]
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, null, null);
      log.info("Events length: " + events.length);
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(5);
      done();
    });
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events based on period", async (done) => {
      const timing = {
        repeat: {
          count: 4,
          frequency: 1,
          period: 1,
          periodUnit: "d"
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-01-29T08:51:50.242", "2020-01-31T08:51:50.242");
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(1);
      done();
    });
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events based on dayOfweek", async (done) => {
      const timing = {
        repeat: {
          count: 10,
          frequency: 1,
          period: 1,
          periodUnit: "d",
          dayOfWeek: ["wed", "fri"]
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-01-27T12:00:00.000+02:00", "2020-02-22T23:59:59.000Z");
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(1);
      done();
    });
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events based on period for period unit as mo", async (done) => {
      const timing = {
        repeat: {
          count: 4,
          frequency: 1,
          period: 1,
          periodUnit: "mo"
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-01-29T08:51:50.242", "2020-05-29T08:51:50.242");
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(1);
      done();
    });
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events based on SID", async (done) => {
      const timing = {
        code: {
          text: "Code For SID",
          coding: [
            {
              code: "SID",
              display: "Specific Intervals"
            }
          ]
        },
        repeat: {
          boundsPeriod: {
            start: "2020-02-01T12:00:00.000Z",
            end: "2020-02-10T23:59:59.000Z"
          },
          frequency: 1,
          period: 1,
          periodUnit: "d",
          timeOfDay: ["14:00:00"]
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-01-30T12:00:00.000Z", "2020-02-28T12:00:00.000Z");
      log.info("Events length: " + events.length);
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(1);
      done();
    });
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events based on events array", async (done) => {
      const timing = {
        event: ["2020-02-28T10:22:31.106Z"],
        code: {
          text: "Code For SDT",
          coding: [
            {
              code: "SDT",
              display: "Specific dates and time"
            }
          ]
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-02-03T10:22:31.106Z", "2020-03-02T10:22:31.106Z");
      log.info(JSON.stringify(events));
      expect(events.length).toEqual(1);
      done();
    });
  });
  describe("#generateDateEventsFromTiming()", () => {
    it("generate events based on period and tz", async (done) => {
      const timing = {
        repeat: {
          frequency: 1,
          period: 1,
          periodUnit: "d",
          boundsPeriod: {
            start: "2020-02-26T09:00:00.000+03:00",
            end: "2020-02-29T08:00:00.000+03:00"
          }
        }
      };
      const events = TimingEventsGenerator.generateDateEventsFromTiming(timing, "2020-02-26T10:00:00.000Z", null);
      log.info(JSON.stringify(events));
      expect(events.length).toBeGreaterThan(1);
      done();
    });
  });
});
