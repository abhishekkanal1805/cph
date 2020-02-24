/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { JsonParser } from "./jsonParser";

describe("JsonParser", () => {
  describe("#safeParse()", () => {
    it("Throws error if malformed JSON string is provided", async (done) => {
      const testRecord = "{ab::123}";
      const expectedError = new BadRequestResult(errorCodeMap.InvalidRequest.value, errorCodeMap.InvalidRequest.description);
      try {
        JsonParser.safeParse(testRecord);
      } catch (error) {
        expect(error).toEqual(expectedError);
        done();
        return;
      }
      done.fail("Should have thrown a BadRequestResult error.");
    });

    it("Parse correctly for a legal JSON", async (done) => {
      const testRecord = { ab: 123 };
      const testRecordString = JSON.stringify(testRecord);
      let result;
      try {
        result = JsonParser.safeParse(testRecordString);
      } catch (error) {
        result = error;
      }
      // make a deep comparision of all the properties
      expect(result).toEqual(testRecord);
      done();
    });
  });

  describe("#findValuesForKey()", () => {
    it("If searched keypath is present in all the records, no nulls should be found.", async (done) => {
      const testKeyPath = "b.c";
      const expectedValues = [1, 11, 111];
      const testRecords = [{ a: 1000, b: { c: expectedValues[0] } }, { a: 100, b: { c: expectedValues[1] } }, { a: 1000, b: { c: expectedValues[2] } }];
      const result: any[] = JsonParser.findValuesForKey(testRecords, testKeyPath);
      expect(result.length).toEqual(3);
      expect(result.includes(expectedValues[0])).toEqual(true);
      expect(result.includes(expectedValues[1])).toEqual(true);
      expect(result.includes(expectedValues[2])).toEqual(true);
      done();
    });
    it("Key search can return values of any type - as long as values are truthy", async (done) => {
      const testKeyPath = "b.c";
      const expectedValues = [1, "text values", true, { foo: "object value" }, ["array", "value"]];
      const testRecords = [
        { a: 10, b: { c: expectedValues[0] } },
        { a: 100, b: { c: expectedValues[1] } },
        { a: 1000, b: { c: expectedValues[2] } },
        { a: 10000, b: { c: expectedValues[3] } },
        { a: 100000, b: { c: expectedValues[4] } }
      ];
      const result: any[] = JsonParser.findValuesForKey(testRecords, testKeyPath);
      expect(result.length).toEqual(5);
      expect(result.includes(expectedValues[0])).toEqual(true);
      expect(result.includes(expectedValues[1])).toEqual(true);
      expect(result.includes(expectedValues[2])).toEqual(true);
      expect(result.includes(expectedValues[3])).toEqual(true);
      expect(result.includes(expectedValues[4])).toEqual(true);
      done();
    });

    it("Key search will return values even if keypath is nested several layers", async (done) => {
      const testKeyPath = "b.c.z";
      const expectedValues = ["two level deep", 123];
      const testRecords = [{ a: 1, b: { c: { z: expectedValues[0] } } }, { a: 10, b: { c: { z: expectedValues[1] } } }];
      const result: any[] = JsonParser.findValuesForKey(testRecords, testKeyPath);
      expect(result.length).toEqual(2);
      expect(result.includes(expectedValues[0])).toEqual(true);
      expect(result.includes(expectedValues[1])).toEqual(true);
      done();
    });

    it("Key search will return nulls if the keypath is found but the values held are all falsy", async (done) => {
      const testKeyPath = "a.c";
      // const expectedValues = [null, null, null, null, null];
      const testRecords = [
        { a: 1000, b: { c: "" } },
        { a: 1000, b: { c: 0 } },
        { a: 100, b: { c: false } },
        { a: 1000, b: { c: null } },
        { a: 10000, b: { c: undefined } }
      ];
      const result: any[] = JsonParser.findValuesForKey(testRecords, testKeyPath);
      expect(result.length).toEqual(1);
      // expect(result.includes(expectedValues[0])).toEqual(true);
      done();
    });

    it("Key search will return nulls if the keypath is not found", async (done) => {
      const testKeyPath = "z.c";
      // const expectedValues = [null, null, null, null];
      const testRecords = [{ a: 1, b: { c: 132 } }, { a: 10, b: { c: "bla" } }, { a: 1000, b: { c: true } }, { a: 10000, b: { c: {} } }];
      const result: any[] = JsonParser.findValuesForKey(testRecords, testKeyPath);
      expect(result.length).toEqual(1);
      // expect(result.includes(expectedValues[0])).toEqual(true);
      done();
    });
  });

  describe("#findAllKeysAsMap()", () => {
    it("If searched keypath is present in all the records, no nulls should be found.", async (done) => {
      const testKeyPath = "b.c";
      const expectedValues = [1, 11, 111];
      const testRecords = [{ a: 1000, b: { c: expectedValues[0] } }, { a: 100, b: { c: expectedValues[1] } }, { a: 1000, b: { c: expectedValues[2] } }];
      const keyToValuesMap = new Map();
      keyToValuesMap.set(testKeyPath, []);
      const result: Map<string, any[]> = JsonParser.findAllKeysAsMap(testRecords, testKeyPath);
      expect(result.get(testKeyPath)).toEqual(expectedValues);
      done();
    });

    it("Key search can return values of any type - as long as values are truthy", async (done) => {
      const testKeyPath = "b.c";
      const expectedValues = [1, "text values", true, { foo: "object value" }, ["array", "value"]];
      const testRecords = [
        { a: 10, b: { c: expectedValues[0] } },
        { a: 100, b: { c: expectedValues[1] } },
        { a: 1000, b: { c: expectedValues[2] } },
        { a: 10000, b: { c: expectedValues[3] } },
        { a: 100000, b: { c: expectedValues[4] } }
      ];
      const keyToValuesMap = new Map();
      keyToValuesMap.set(testKeyPath, []);
      const result: Map<string, any[]> = JsonParser.findAllKeysAsMap(testRecords, testKeyPath);
      expect(result.get(testKeyPath)).toEqual(expectedValues);
      done();
    });

    it("Key search will return nulls if the keypath is found but the values held are all falsy", async (done) => {
      const testKeyPath = "a.c";
      const expectedValues = [null, null, null, null, null];
      const testRecords = [
        { a: 1000, b: { c: "" } },
        { a: 1000, b: { c: 0 } },
        { a: 100, b: { c: false } },
        { a: 1000, b: { c: null } },
        { a: 10000, b: { c: undefined } }
      ];
      const keyToValuesMap = new Map();
      keyToValuesMap.set(testKeyPath, []);
      const result: Map<string, any[]> = JsonParser.findAllKeysAsMap(testRecords, testKeyPath);
      expect(result.get(testKeyPath)).toEqual(expectedValues);
      done();
    });

    it("Key search will return nulls if the keypath is not found", async (done) => {
      const testKeyPath = "z.c";
      const expectedValues = [null, null, null, null];
      const testRecords = [{ a: 1, b: { c: 132 } }, { a: 10, b: { c: "bla" } }, { a: 1000, b: { c: true } }, { a: 10000, b: { c: {} } }];
      const keyToValuesMap = new Map();
      keyToValuesMap.set(testKeyPath, []);
      const result: Map<string, any[]> = JsonParser.findAllKeysAsMap(testRecords, testKeyPath);
      expect(result.get(testKeyPath)).toEqual(expectedValues);
      done();
    });

    it("Key search will return values even if keypath is nested several layers", async (done) => {
      const testKeyPath = "b.c.z";
      const expectedValues = ["two level deep", 123];
      const testRecords = [{ a: 1, b: { c: { z: expectedValues[0] } } }, { a: 10, b: { c: { z: expectedValues[1] } } }];
      const keyToValuesMap = new Map();
      keyToValuesMap.set(testKeyPath, []);
      const result: Map<string, any[]> = JsonParser.findAllKeysAsMap(testRecords, testKeyPath);
      expect(result.get(testKeyPath)).toEqual(expectedValues);
      done();
    });
  });

  describe("#findAllReferences()", () => {
    it("Get all references from input payload", (done) => {
      const testRecord = { abcd1: [{ abcd2: { abcd3: { reference: "a/123" } }, xyz: "v/123" }] };
      const expectedResult = {
        a: [
          {
            id: "123",
            includedPath: ["abcd1.[0].abcd2.abcd3.reference"],
            excludedPath: []
          }
        ]
      };
      let result;
      try {
        result = JsonParser.findAllReferences(testRecord);
      } catch (error) {
        result = error;
      }
      expect(result).toEqual(expectedResult);
      done();
    });

    it("Get all references from input payload for different references", (done) => {
      const testRecord = { abcd1: [{ abcd2: { abcd3: { reference: "a/123" } }, xyz: { reference: "v/456" } }] };
      const expectedResult = {
        a: [
          {
            id: "123",
            includedPath: ["abcd1.[0].abcd2.abcd3.reference"],
            excludedPath: []
          }
        ],
        v: [
          {
            id: "456",
            includedPath: ["abcd1.[0].xyz.reference"],
            excludedPath: []
          }
        ]
      };
      let result;
      try {
        result = JsonParser.findAllReferences(testRecord);
      } catch (error) {
        result = error;
      }
      expect(result).toEqual(expectedResult);
      done();
    });

    it("Get all references from input payload for same references", (done) => {
      const testRecord = { abcd1: [{ abcd2: { abcd3: { reference: "a/123" } }, xyz: { reference: "a/123" } }] };
      const expectedResult = {
        a: [
          {
            id: "123",
            includedPath: ["abcd1.[0].abcd2.abcd3.reference", "abcd1.[0].xyz.reference"],
            excludedPath: []
          }
        ]
      };
      let result;
      try {
        result = JsonParser.findAllReferences(testRecord);
      } catch (error) {
        result = error;
      }
      expect(result).toEqual(expectedResult);
      done();
    });

    it("Get all references from input array payload", (done) => {
      const testRecord = [{ abcd1: [{ abcd2: { abcd3: { reference: "a/123" } } }] }, { abcd1: [{ xyz: { reference: "a/123" } }] }];
      const expectedResult = {
        a: [
          {
            id: "123",
            includedPath: ["[0].abcd1.[0].abcd2.abcd3.reference", "[1].abcd1.[0].xyz.reference"],
            excludedPath: []
          }
        ]
      };
      let result;
      try {
        result = JsonParser.findAllReferences(testRecord);
      } catch (error) {
        result = error;
      }
      expect(result).toEqual(expectedResult);
      done();
    });

    it("Get all references from input payload for exclude list", (done) => {
      const testRecord = { abcd1: [{ abcd2: { abcd3: { reference: "a/123" } }, xyz: { reference: "a/123" } }] };
      const expectedResult = {
        a: [
          {
            id: "123",
            excludedPath: ["abcd1.[0].abcd2.abcd3.reference", "abcd1.[0].xyz.reference"],
            includedPath: []
          }
        ]
      };
      const excludeElements = ["abcd1.[0]"];
      let result;
      try {
        result = JsonParser.findAllReferences(testRecord, excludeElements);
      } catch (error) {
        result = error;
      }
      expect(result).toEqual(expectedResult);
      done();
    });

    it("Get all references from input payload array for exclude list", (done) => {
      const testRecord = [{ abcd1: [{ abcd2: { abcd3: { reference: "a/123" } }, xyz: { reference: "a/123" } }] }];
      const expectedResult = {
        a: [
          {
            id: "123",
            includedPath: ["[0].abcd1.[0].abcd2.abcd3.reference"],
            excludedPath: ["[0].abcd1.[0].xyz.reference"]
          }
        ]
      };
      const excludeElements = ["[0].abcd1.[0].xyz"];
      let result;
      try {
        result = JsonParser.findAllReferences(testRecord, excludeElements);
      } catch (error) {
        result = error;
      }
      expect(result).toEqual(expectedResult);
      done();
    });
  });
});
