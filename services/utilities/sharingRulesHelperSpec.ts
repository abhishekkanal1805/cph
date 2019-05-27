import "jasmine";
import * as moment from "moment";
import { Op } from "sequelize";
import { QueryGenerator } from "./queryGenerator";
import { SharingRulesHelper } from "./sharingRulesHelper";

describe("SharingRulesHelper", () => {
    describe("#expressionEvaluator()", () => {
        it("Returns date if only month is present in expression", (done) => {
          const expression = "(JANUARY)";
          const expected = "2019-01-31";
          const result = SharingRulesHelper.expressionEvaluator(expression);
          expect(result).toEqual(expected);
          done();
        });
        it("Returns date if only day is present in expression", (done) => {
            const expression = "(MONDAY)";
            const expected = moment().weekday(-6).format("YYYY-MM-DD");
            const result = SharingRulesHelper.expressionEvaluator(expression);
            expect(result).toEqual(expected);
            done();
        });
        it("Returns date if only year is present in expression", (done) => {
        const expression = "(2019)";
        const expected = "2019-12-31";
        const result = SharingRulesHelper.expressionEvaluator(expression);
        expect(result).toEqual(expected);
        done();
        });
    });

    describe("#generateConditionForSingleCriteria()", () => {
        it("Returns conditions for date", (done) => {
          const criterion = {
              type: "single",
              element: "dateAsserted",
              operation: "greaterThanOrEqual",
              value: "2022-02-02"
          };
          const operationMap = {
            greaterThan: [Op.gt, "gt"],
            greaterThanOrEqual: [Op.gte, "ge"],
            lessThan: [Op.lt, "lt"],
            lessThanOrEqual: [Op.lte, "le"],
            equal: [Op.eq, ""],
            notEqual: [Op.ne, ""]
          };
          spyOn(QueryGenerator, "createDateSearchConditions").and.callFake((column, value, dateCondition) => {
            dateCondition = {
                [Op.or]: [{
                    ["dateAsserted"]: {
                        [Op.gte]: "2022-02-02"
                    }
                }]
            };
          });
          const expected = {
            [Op.or]: [{
                ["dateAsserted"]: {
                    [Op.gte]: "2022-02-02"
                }
            }]
          };
          const result = SharingRulesHelper.generateConditionForSingleCriteria(criterion, operationMap);
          expect(result).toEqual(expected);
          done();
        });

        it("Returns conditions for string", (done) => {
          const criterion = {
              type: "single",
              element: "category[*].coding[*].code",
              operation: "equal",
              value: "vital-sign"
          };
          const operationMap = {
            greaterThan: [Op.gt, "gt"],
            greaterThanOrEqual: [Op.gte, "ge"],
            lessThan: [Op.lt, "lt"],
            lessThanOrEqual: [Op.lte, "le"],
            equal: [Op.eq, ""],
            notEqual: [Op.ne, ""]
          };
          spyOn(QueryGenerator, "getNestedAttributes").and.callFake((attributes, value, nestedAttributes, arrFlag) => {
            nestedAttributes = {
                category: {
                    [Op.contains]: [{
                        coding: {
                            code: "vital-sign"
                        }
                    }]
                }
            };
          });
          const expected = {
            category: {
                [Op.contains]: [{
                    coding: {
                        code: "vital-sign"
                    }
                }]
            }
          };
          const result = SharingRulesHelper.generateConditionForSingleCriteria(criterion, operationMap);
          expect(result).toEqual(expected);
          done();
        });
    });

    describe("#getCriteriaClause()", () => {
        it("Returns conditions based on criteria", (done) => {
            const criteria = [{
                type: "single",
                element: "dateAsserted",
                operation: "greaterThanOrEqual",
                value: "2022-02-02"
            }, {
                type: "single",
                element: "category[*].coding[*].code",
                operation: "vital-sign",
                value: "vital-sign"
            }];
            spyOn(SharingRulesHelper, "generateConditionForSingleCriteria").and.callFake((criterion, operationMap) => {
                return {
                    ["dateAsserted"]: {
                        [Op.gte]: "2022-02-02"
                    }
                };
            });
            const expected: any = {
                [Op.or]: [{
                    ["dateAsserted"]: {
                        [Op.gte]: "2022-02-02"
                    },
                    ["category"]: {
                        [Op.contains]: [{
                            coding: {
                                code: "vital-sign"
                            }
                        }]
                    }
                }]
            };
            const operator = Op.or;
            const result = {};
            result[operator] = [];
            result[operator].push(SharingRulesHelper.generateConditionForSingleCriteria(criteria[0], {greaterThan: [Op.gt, "gt"]}));
            result[operator].push(SharingRulesHelper.generateConditionForSingleCriteria(criteria[1], {equal: [Op.eq, ""]}));
            expect(result).toEqual(expected);
            done();
        });
    });
});
