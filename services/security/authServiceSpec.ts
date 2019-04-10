import "jasmine";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { DataService } from "../dao/dataService";
import { AuthService } from "./authService";

describe("Test checkUserTypeBasedAccess() - ", () => {
  it("Do nothing if loggedin user type is system", async (done) => {
    let result;
    try {
      result = await AuthService.checkUserTypeBasedAccess("123", "system", "123");
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(undefined);
    done();
  });
  it("Throw error if patient is trying to post records for other patient", async (done) => {
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    let result;
    try {
      result = await AuthService.checkUserTypeBasedAccess("123", "patient", "1234");
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("Works fine if patient is trying to post records for his own", async (done) => {
    let result;
    try {
      result = await AuthService.checkUserTypeBasedAccess("123", "patient", "123");
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(undefined);
    done();
  });
  it("Throw error if connection doesnt exists for practitioner and patient", async (done) => {
    spyOn(DataService, "recordsCount").and.callFake(() => {
      return 0;
    });
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    let result;
    try {
      result = await AuthService.checkUserTypeBasedAccess("123", "practitioner", "123");
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("Work fine if connection exists for practitioner and patient", async (done) => {
    spyOn(DataService, "recordsCount").and.callFake(() => {
      return 1;
    });
    let result;
    try {
      result = await AuthService.checkUserTypeBasedAccess("123", "practitioner", "123");
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(undefined);
    done();
  });
});
