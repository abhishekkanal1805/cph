import "jasmine";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { DAOService } from "../dao/daoService";
import { DataFetch } from "./dataFetch";

const testProfileId123 = "123";
const testProfile123 = { id: testProfileId123, status: Constants.ACTIVE, type: "patient", name: { given: ["Jon"], family: "Sno" } };
const testProfileId456 = "456";
const testProfile456 = { id: testProfileId456, status: Constants.ACTIVE, type: "patient", name: { given: ["Sam"], family: "Tarly" } };
const testInactiveProfileId = "000";
const testInactiveProfile = { id: testInactiveProfileId, status: Constants.INACTIVE, type: "patient", name: { given: ["Ramsey"], family: "Bolton" } };

describe("Test getUserProfile() - ", () => {

  it("Throw error if profiles provided is null", async (done) => {
    const profile = null;
    let result;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      await DataFetch.getUserProfile(profile);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });

  it("Throw error if profiles provided is empty array", async (done) => {
    const profile = null;
    let result;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      await DataFetch.getUserProfile(profile);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });

  it("Throw error if any of the profile (456) was not retrievable", async (done) => {
    spyOn(DAOService, "search").and.callFake(() => {
      return [testProfile123];
    });
    let result;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      await DataFetch.getUserProfile([testProfileId123, testProfileId456]);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });

  it("Throw error if any of the profile (123) was not retrievable", async (done) => {
    spyOn(DAOService, "search").and.callFake(() => {
      return [testProfile456];
    });
    let result;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      await DataFetch.getUserProfile([testProfileId123, testProfileId456]);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });

  it("Throw error if any of the provided user profile is NOT active", async (done) => {
    spyOn(DAOService, "search").and.callFake(() => {
      return [testInactiveProfile, testProfile123];
    });
    let result = null;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      await DataFetch.getUserProfile([testInactiveProfileId, testProfileId123]);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });

  it("Return user attributes when two active user ID is provided", async (done) => {
    spyOn(DAOService, "search").and.callFake(() => {
      return [testProfile123, testProfile456];
    });
    const result = await DataFetch.getUserProfile([testProfileId123, testProfileId456]);
    // verify profile 123
    expect(result[testProfileId123].profileStatus).toEqual(testProfile123.status);
    expect(result[testProfileId123].profileType).toEqual(testProfile123.type);
    expect(result[testProfileId123].displayName).toContain(testProfile123.name.family);
    expect(result[testProfileId123].displayName).toContain(testProfile123.name.given[0]);
    // verify profile 456
    expect(result[testProfileId456].profileStatus).toEqual(testProfile456.status);
    expect(result[testProfileId456].profileType).toEqual(testProfile456.type);
    expect(result[testProfileId456].displayName).toContain(testProfile456.name.family);
    expect(result[testProfileId456].displayName).toContain(testProfile456.name.given[0]);
    done();
  });

  it("Return user attributes when one active user ID is provided", async (done) => {
    spyOn(DAOService, "search").and.callFake(() => {
      return [testProfile123];
    });
    const result = await DataFetch.getUserProfile([testProfileId123]);
    // verify profile 123
    expect(result[testProfileId123].profileStatus).toEqual(testProfile123.status);
    expect(result[testProfileId123].profileType).toEqual(testProfile123.type);
    expect(result[testProfileId123].displayName).toContain(testProfile123.name.family);
    expect(result[testProfileId123].displayName).toContain(testProfile123.name.given[0]);
    done();
  });
});
