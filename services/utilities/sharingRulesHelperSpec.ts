/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { Op } from "sequelize";
import { SharingRulesHelper } from "./sharingRulesHelper";

function expressionConverter(expression: any, response: any) {
  for (const attribute in expression) {
    const value = expression[attribute];
    if (typeof value == "object") {
      response[attribute] = Array.isArray(value) ? [] : {};
      expressionConverter(value, response[attribute]);
    } else {
      response[attribute] = value;
    }
  }
  for (const sym of Object.getOwnPropertySymbols(expression)) {
    const key = Symbol.keyFor(sym);
    const value = expression[sym];
    if (typeof value == "object") {
      response[key] = Array.isArray(value) ? [] : {};
      expressionConverter(value, response[key]);
    } else {
      response[key] = value;
    }
  }
}

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
    // it("Returns current week monday in YYYY-MM-DD format if current day is Tuesday and dateOfLast(MONDAY) present in sharing rules expression", (done) => {
    //   const expression = "dateOfLast(MONDAY)";
    //   jasmine.clock().mockDate(new Date("2019-07-30"));
    //   const expected = "2019-07-29";
    //   const result = SharingRulesHelper.expressionEvaluator(expression);
    //   expect(result).toEqual(expected);
    //   done();
    // });
  });
  describe("#generateConditionForSingleCriteria()", () => {
    describe("SingleCriteria for root attribute", () => {
      it("Equal operation", (done) => {
        const criteria = {
          type: "single",
          element: "status",
          operation: "equal",
          value: "active"
        };
        const operationMap = {
          equal: [Op.eq, ""]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              "dataResource.status": {
                [Op.eq]: "active"
              }
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("greaterThan operation", (done) => {
        const criteria = {
          type: "single",
          element: "status",
          operation: "greaterThan",
          value: "10"
        };
        const operationMap = {
          greaterThan: [Op.gt, "gt"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              "dataResource.status": {
                [Op.gt]: "10"
              }
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("greaterThanEqual operation", (done) => {
        const criteria = {
          type: "single",
          element: "status",
          operation: "greaterThanEqual",
          value: "10"
        };
        const operationMap = {
          greaterThanEqual: [Op.gte, "ge"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              "dataResource.status": {
                [Op.gte]: "10"
              }
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("lessThan operation", (done) => {
        const criteria = {
          type: "single",
          element: "status",
          operation: "lessThan",
          value: "10"
        };
        const operationMap = {
          lessThan: [Op.lt, "lt"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              "dataResource.status": {
                [Op.lt]: "10"
              }
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("lessThanEqual operation", (done) => {
        const criteria = {
          type: "single",
          element: "status",
          operation: "lessThanEqual",
          value: "10"
        };
        const operationMap = {
          lessThanEqual: [Op.lte, "le"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              "dataResource.status": {
                [Op.lte]: "10"
              }
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("notEqual operation", (done) => {
        const criteria = {
          type: "single",
          element: "status",
          operation: "notEqual",
          value: "10"
        };
        const operationMap = {
          notEqual: [Op.ne, "ne"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              "dataResource.status": {
                [Op.ne]: "10"
              }
            },
            {
              val:
                " not exists (select true from unnest(array(select jsonb_array_elements(jsonb_build_array(\"dataResource\" #> '{status}')) )) as element " +
                "where element::text = '\"10\"')"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
    });
    describe("SingleCriteria for nested attribute string", () => {
      it("Equal operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "equal",
          value: "vital-sign"
        };
        const operationMap = {
          equal: [Op.eq, ""]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          dataResource: {
            [Op.contains]: {
              category: [
                {
                  coding: [
                    {
                      code: "vital-sign"
                    }
                  ]
                }
              ]
            }
          }
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("greaterThan operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "greaterThan",
          value: "vital-sign"
        };
        const operationMap = {
          greaterThan: [Op.gt, "gt"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where element::text > '\"vital-sign\"')"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("greaterThan operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "greaterThanEqual",
          value: "vital-sign"
        };
        const operationMap = {
          greaterThanEqual: [Op.gte, "ge"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where element::text >= '\"vital-sign\"')"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("LessThan operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "lessThan",
          value: "vital-sign"
        };
        const operationMap = {
          lessThan: [Op.lt, "lt"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where element::text < '\"vital-sign\"')"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("LessThanEqual operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "lessThanEqual",
          value: "vital-sign"
        };
        const operationMap = {
          lessThanEqual: [Op.lte, "le"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where element::text <= '\"vital-sign\"')"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("notEqual operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "notEqual",
          value: "vital-sign"
        };
        const operationMap = {
          notEqual: [Op.ne, "ne"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " not exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where element::text = '\"vital-sign\"')"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
    });
    describe("SingleCriteria for nested attribute number", () => {
      it("Equal operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "equal",
          value: 10
        };
        const operationMap = {
          equal: [Op.eq, ""]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          dataResource: {
            contains: {
              category: [
                {
                  coding: [{ code: 10 }]
                }
              ]
            }
          }
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("greaterThan operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "greaterThan",
          value: 10
        };
        const operationMap = {
          greaterThan: [Op.gt, "gt"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where (case when element = 'null'  then null else element end )::text::numeric > 10)"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("greaterThanEqual operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "greaterThanEqual",
          value: 10
        };
        const operationMap = {
          greaterThanEqual: [Op.gte, "ge"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where (case when element = 'null'  then null else element end )::text::numeric >= 10)"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("lessThan operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "lessThan",
          value: 10
        };
        const operationMap = {
          lessThan: [Op.lt, "lt"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where (case when element = 'null'  then null else element end )::text::numeric < 10)"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("lessThanEqual operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "lessThanEqual",
          value: 10
        };
        const operationMap = {
          lessThanEqual: [Op.lte, "le"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where (case when element = 'null'  then null else element end )::text::numeric <= 10)"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("notEqual operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "notEqual",
          value: 10
        };
        const operationMap = {
          notEqual: [Op.ne, "ne"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " not exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where (case when element = 'null'  then null else element end )::text::numeric = 10)"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
    });
    describe("SingleCriteria for nested attribute boolean", () => {
      it("equal operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "equal",
          value: true
        };
        const operationMap = {
          equal: [Op.eq, ""]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          dataResource: {
            [Op.contains]: {
              category: [{ coding: [{ code: true }] }]
            }
          }
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("notEqual operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "notEqual",
          value: true
        };
        const operationMap = {
          notEqual: [Op.ne, "ne"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " not exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where element::text = 'true')"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
      it("greaterThan operation", (done) => {
        const criteria = {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "greaterThan",
          value: true
        };
        const operationMap = {
          greaterThan: [Op.gt, "gt"]
        };
        const res = SharingRulesHelper.generateConditionForSingleCriteria(criteria, operationMap);
        const convertedResult = {};
        const convertedExpected = {};
        const expected = {
          [Op.or]: [
            {
              val:
                " exists (select true from unnest(array(select jsonb_array_elements(unnest(array(select jsonb_array_elements(\"dataResource\" #> '{category}') #> " +
                "'{coding}'))) #> '{code}')) as element where element::text > 'true')"
            }
          ]
        };
        expressionConverter(res, convertedResult);
        expressionConverter(expected, convertedExpected);
        expect(convertedResult).toEqual(convertedExpected);
        done();
      });
    });
  });
});
