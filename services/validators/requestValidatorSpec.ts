import "jasmine";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult, ForbiddenResult, NotFoundResult } from "../../common/objects/custom-errors";
import { DataService } from "../dao/dataService";
import { RequestValidator } from "./requestValidator";

describe("Test validateBundleTotal() - ", () => {
  it("Throw error if bundle total doesnt match total attribute passed in parameter", (done) => {
    const records = [{}],
      total = 2;
    let result;
    const expected = new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    try {
      RequestValidator.validateBundleTotal(records, total);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("Returns no error if bundle total match total attribute", (done) => {
    const records = [{}],
      total = 1;
    let result = null;
    const expected = null;
    try {
      RequestValidator.validateBundleTotal(records, total);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
});

describe("Test validateBundlePostLimit() - ", () => {
  it("Throw error if bundle length is more than POST limit", (done) => {
    const records = [];
    records.length = 600;
    let result;
    const expected = new BadRequestResult(errorCodeMap.RequestTooLarge.value, errorCodeMap.RequestTooLarge.description);
    try {
      RequestValidator.validateBundlePostLimit(records, Constants.POST_LIMIT);
    } catch (err) {
      result = err;
    }
    expect(expected).toEqual(result);
    done();
  });
  it("Throw error if bundle length is more than POST limit", (done) => {
    const records = [];
    records.length = 300;
    let result = null;
    const expected = null;
    try {
      RequestValidator.validateBundlePostLimit(records, Constants.POST_LIMIT);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
});

describe("Test validateDeviceIds() - ", () => {
  it("Throw error if multiple device id present in bundle", async (done) => {
    const deviceIds = ["123", "12"];
    let result;
    const expected = new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    try {
      await RequestValidator.validateDeviceIds(deviceIds);
    } catch (err) {
      result = err;
    }
    expect(expected).toEqual(result);
    done();
  });
  it("return void if no device id is passed to it", async (done) => {
    const deviceIds = [];
    let result = null;
    const expected = null;
    try {
      await RequestValidator.validateDeviceIds(deviceIds);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("Throw error if device id not present in database", async (done) => {
    spyOn(DataService, "recordsCount").and.callFake(() => {
      return 0;
    });
    const deviceIds = ["123"];
    let result;
    const expected = new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
    try {
      await RequestValidator.validateDeviceIds(deviceIds);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("No error is returned if unique device id is passed which is present in db", async (done) => {
    spyOn(DataService, "recordsCount").and.callFake(() => {
      return 1;
    });
    const deviceIds = ["123"];
    let result = null;
    const expected = null;
    try {
      await RequestValidator.validateDeviceIds(deviceIds);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
});

describe("Test validateUserReferenceAgainstLoggedInUser() - ", () => {
  it("Throw error if loggedin Id is not same as user reference", (done) => {
    const loggedInId = "12",
      userReferenceId = "UserProfile/123";
    let result;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      RequestValidator.validateUserReferenceAgainstLoggedInUser(loggedInId, userReferenceId);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("return void if logged in Id is same as user reference id", (done) => {
    const loggedInId = "123",
      userReferenceId = "UserProfile/123";
    let result = null;
    const expected = null;
    try {
      RequestValidator.validateUserReferenceAgainstLoggedInUser(loggedInId, userReferenceId);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
});

describe("Test validateUniquePatientReference() - ", () => {
  it("Throw error patient reference id are more than 1", (done) => {
    const patientReferenceId = ["1", "2"];
    let result;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      RequestValidator.validateUniquePatientReference(patientReferenceId);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("No error is thrown if patient reference are unique", (done) => {
    const patientReferenceId = ["1"];
    let result = null;
    const expected = null;
    try {
      RequestValidator.validateUniquePatientReference(patientReferenceId);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
});

describe("Test validateNumberOfUniqueUserReference() - ", () => {
  it("Throw error user reference id are more than 1", (done) => {
    const userReferenceId = ["1", "2"];
    let result;
    const expected = new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
    try {
      RequestValidator.validateNumberOfUniqueUserReference(userReferenceId);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("No error is thrown if patient reference are unique", (done) => {
    const userReferenceId = ["1"];
    let result = null;
    const expected = null;
    try {
      RequestValidator.validateUniquePatientReference(userReferenceId);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
});
