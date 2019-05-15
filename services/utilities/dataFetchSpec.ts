import "jasmine";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
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

  it("Errors coming out of the DAOService will be not be caught by DataFetch", async (done) => {
    const expectedErrorMessage = "Error coming from the DAO.search";
    spyOn(DAOService, "search").and.throwError(expectedErrorMessage);
    let result: Error = null;
    try {
      await DataFetch.getUserProfile([testInactiveProfileId, testProfileId123]);
    } catch (err) {
      result = err;
    }
    expect(result.message).toEqual(expectedErrorMessage);
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

describe("Test getValidIds() - ", () => {

  it("Query should match all provided ids and return if record is not deleted", async (done) => {
    const testRecordIds: string[] = [testProfileId123, testProfileId456];
    const expectedSearchResults = [{id: testProfileId123, meta: {}}, {id: testProfileId456, meta: {}}];

    let capturedQuery;
    spyOn(DAOService, "search").and.callFake((model, query) => {
      capturedQuery = query;
      return expectedSearchResults;
    });

    const actualSearchResults = await DataFetch.getValidIds({}, testRecordIds);
    // verify the search results
    expect(expectedSearchResults).toEqual(actualSearchResults);
    expect(capturedQuery.where.id[Op.or]).toEqual(testRecordIds);
    expect(capturedQuery.where["meta.isDeleted"]).toEqual(false);
    expect(capturedQuery.attributes).toContain("id");
    expect(capturedQuery.attributes).toContain("meta");
    done();
  });

  it("Errors coming out of the DAOService will be not be caught by DataFetch", async (done) => {
    const expectedErrorMessage = "Error coming from the DAO.search";
    spyOn(DAOService, "search").and.throwError(expectedErrorMessage);
    let result: Error = null;
    try {
      await DataFetch.getValidIds({}, [testInactiveProfileId, testProfileId123]);
    } catch (err) {
      result = err;
    }
    expect(result.message).toEqual(expectedErrorMessage);
    done();
  });

});

describe("Test getValidUserProfileIds() - ", () => {

  it("Query should match all provided ids and return if record is not deleted and status is active", async (done) => {
    const testRecordIds: string[] = [testProfileId123, testProfileId456];
    const expectedSearchResults = [{id: testProfileId123, meta: {}}, testProfile456];

    let capturedQuery;
    let capturedModel;
    spyOn(DAOService, "search").and.callFake((model, query) => {
      capturedQuery = query;
      capturedModel = model;
      return expectedSearchResults;
    });

    const actualSearchResults = await DataFetch.getValidUserProfileIds(testRecordIds);
    // verify the search results
    expect(expectedSearchResults).toEqual(actualSearchResults);
    expect(capturedModel).toEqual(UserProfile);
    expect(capturedQuery.where.id[Op.or]).toEqual(testRecordIds);
    expect(capturedQuery.where["meta.isDeleted"]).toEqual(false);
    expect(capturedQuery.where["status"]).toEqual(UserProfile.STATUS_ACTIVE);
    expect(capturedQuery.attributes).toContain("id");
    done();
  });

  it("Errors coming out of the DAOService will be not be caught by DataFetch", async (done) => {
    const expectedErrorMessage = "Error coming from the DAO.search";
    spyOn(DAOService, "search").and.throwError(expectedErrorMessage);
    let result: Error = null;
    try {
      await DataFetch.getValidUserProfileIds([testInactiveProfileId, testProfileId123]);
    } catch (err) {
      result = err;
    }
    expect(result.message).toEqual(expectedErrorMessage);
    done();
  });

});
