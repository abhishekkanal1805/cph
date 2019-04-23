import "jasmine";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { DAOService } from "../dao/daoService";
import { DataFetch } from "./dataFetch";

describe("Test getUserProfile() - ", () => {
  it("Throw error if profile is missing in authorizer data", async done => {
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
  it("Throw error if user profile of logged in user is not active", async done => {
    spyOn(DAOService, "fetchRowByPk").and.callFake(() => {
      return { status: "inactive" };
    });
    const profile = ["123"];
    let result = null;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      await DataFetch.getUserProfile(profile);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("Return user attributes if user is active", async done => {
    spyOn(DAOService, "fetchRowByPk").and.callFake(() => {
      return { status: Constants.ACTIVE, type: "patient", name: { given: ["Sam"], family: "Jackson" } };
    });
    const profile = ["123"];
    let result;
    const expected = {
      profileStatus: Constants.ACTIVE,
      profileType: "patient",
      profileId: "123",
      displayName: "Jackson, Sam"
    };
    try {
      result = await DataFetch.getUserProfile(profile);
    } catch (err) {
      result = err;
    }
    expect(result.profileStatus).toEqual(expected.profileStatus);
    expect(result.profileType).toEqual(expected.profileType);
    expect(result.displayName).toEqual(expected.displayName);
    expect(result.profileId).toEqual(expected.profileId);
    done();
  });
  it("Throw error if profile is missing in authorizer data", async done => {
    let result;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      await DataFetch.getUserProfile(["80e86ff5-3527-44b0-b2d2-743bfe770b29", "137cbafa-3ac0-48a9-a390-e0d5982a0d05"]);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
});
