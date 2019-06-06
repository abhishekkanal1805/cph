import "jasmine";
import * as moment from "moment";
import { Op } from "sequelize";
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
      const expected = moment()
        .weekday(-6)
        .format("YYYY-MM-DD");
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

  describe("#getCriteriaClause()", () => {
    it("Returns conditions based on criteria", (done) => {
      const criteria = [
        {
          type: "single",
          element: "dateAsserted",
          operation: "greaterThanOrEqual",
          value: "2022-02-02"
        },
        {
          type: "single",
          element: "category[*].coding[*].code",
          operation: "vital-sign",
          value: "vital-sign"
        }
      ];
      spyOn(SharingRulesHelper, "generateConditionForSingleCriteria").and.callFake((criterion, operationMap) => {
        return {
          ["dateAsserted"]: {
            [Op.gte]: "2022-02-02"
          }
        };
      });
      const expected: any = {
        [Op.or]: [
          {
            ["dateAsserted"]: {
              [Op.gte]: "2022-02-02"
            },
            ["category"]: {
              [Op.contains]: [
                {
                  coding: {
                    code: "vital-sign"
                  }
                }
              ]
            }
          }
        ]
      };
      const operator = Op.or;
      const result = {};
      result[operator] = [];
      result[operator].push(SharingRulesHelper.generateConditionForSingleCriteria(criteria[0], { greaterThan: [Op.gt, "gt"] }));
      result[operator].push(SharingRulesHelper.generateConditionForSingleCriteria(criteria[1], { equal: [Op.eq, ""] }));
      expect(result).toEqual(expected);
      done();
    });
  });
});
