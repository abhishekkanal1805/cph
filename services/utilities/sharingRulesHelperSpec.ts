import "jasmine";
// import * as log from "lambda-log";
// import * as moment from "moment";
// import { Op } from "sequelize";
// import { Constants } from "../../common/constants/constants";
import { SharingRulesHelper } from "./sharingRulesHelper";

describe("SharingRulesHelper", () => {
  describe("#expressionEvaluator()", () => {
    it("Returns last date for current year in  format if dateOfLast(year) is present in expression", (done) => {
      const expression = "dateOfLast(2019)";
      const expected = "2019-12-31";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
    it("Returns last date for current year in  format if dateOfLast(year) is present in expression", (done) => {
      const expression = "dateOfLast(19)";
      const expected = "19-12-31";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
    it("Returns last date for current year in YYYY-MM-DD format if dateOfLast(month_fullname) is present in expression", (done) => {
      const expression = "dateOfLast(FEBRUARY)";
      jasmine.clock().mockDate(new Date("2019-03-01"));
      const expected = "2019-02-28";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
    it("Returns last date for current year in YYYY-MM-DD format if dateOfLast(month_fullname) is present in expression", (done) => {
      const expression = "dateOfLast(FEBRUARY)";
      jasmine.clock().mockDate(new Date("2020-03-01"));
      const expected = "2020-02-29";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
    it("Returns last date for current year in YYYY-MM-DD format if dateOfLast(month_shortname) is present in expression", (done) => {
      const expression = "dateOfLast(FEB)";
      jasmine.clock().mockDate(new Date("2020-02-01"));
      const expected = "2020-02-29";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
    it("Returns last date for current year in YYYY-MM-DD format if dateOfLast(month_shortname) is present in expression", (done) => {
      const expression = "dateOfLast(JAN)";
      jasmine.clock().mockDate(new Date("2019-02-01"));
      const expected = "2019-01-31";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
    it("Returns invalid_name-MM-DD if dateOfLast(invalid_name) is present in expression", (done) => {
      const expression = "dateOfLast(JA)";
      const expected = "JA-12-31";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
    it("Returns -MM-DD format if month_fullname without brackets is present in expression", (done) => {
      const expression = "JANUARY";
      const expected = "-12-31";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
    it("Returns previous week monday in YYYY-MM-DD format if current day is monday and dateOfLast(MONDAY) present in sharing rules expression", (done) => {
      const expression = "dateOfLast(MONDAY)";
      jasmine.clock().mockDate(new Date("2019-07-29"));
      const expected = "2019-07-22";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
    it("Returns current week monday in YYYY-MM-DD format if current day is Tuesday and dateOfLast(MONDAY) present in sharing rules expression", (done) => {
      const expression = "dateOfLast(MONDAY)";
      jasmine.clock().mockDate(new Date("2019-07-30"));
      const expected = "2019-07-29";
      const result = SharingRulesHelper.expressionEvaluator(expression);
      expect(result).toEqual(expected);
      done();
    });
  });
});
