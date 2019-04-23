import "jasmine";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { JsonParser } from "./jsonParser";

describe("Test safeParse() - ", () => {
  it("Throw error is incorrect JSON string is passed to it", async done => {
    const record = "{ab::123}";
    const expected = new BadRequestResult(errorCodeMap.InvalidRequest.value, errorCodeMap.InvalidRequest.description);
    let result;
    try {
      result = JsonParser.safeParse(record);
    } catch (error) {
      result = error;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("Parse JSON correctly if its proper JSON", async done => {
    const record = JSON.stringify({ ab: 123 });
    const expected = { ab: 123 };
    let result;
    try {
      result = JsonParser.safeParse(record);
    } catch (error) {
      result = error;
    }
    expect(result.ab).toEqual(expected.ab);
    done();
  });
});

describe("Test findValuesForKeyMap() - ", () => {
  it("Return values map of provided keypath", async done => {
    const record = [{ a: 1, b: { c: 1 } }, { a: 1, b: { c: 2 } }];
    const keysToFetch = new Map();
    keysToFetch.set("b.c", []);
    const result = JsonParser.findValuesForKeyMap(record, keysToFetch);
    expect(result.get("b.c")).toEqual([1, 2]);
    done();
  });
});
