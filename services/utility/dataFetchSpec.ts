import "jasmine";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { DataService } from "../dao/dataService";
import { DataFetch } from "./dataFetch";

describe("Test fetchUserProfileInformationFromAuthorizer() - ", () => {
  it("Throw error if profile is missing in authorizer data", async (done) => {
    const authorizerData = {};
    let result;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      await DataFetch.fetchUserProfileInformationFromAuthorizer(authorizerData);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("Throw error if user profile of logged in user is not active", async (done) => {
    spyOn(DataService, "fetchRowByPk").and.callFake(() => {
      return { status: "inactive" };
    });
    const authorizerData = { profile: "123" };
    let result = null;
    const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    try {
      await DataFetch.fetchUserProfileInformationFromAuthorizer(authorizerData);
    } catch (err) {
      result = err;
    }
    expect(result).toEqual(expected);
    done();
  });
  it("Return user attributes if user is active", async (done) => {
    spyOn(DataService, "fetchRowByPk").and.callFake(() => {
      return { status: Constants.CONNECTION_ACTIVE, type: "patient", name: { given: ["Sam"], family: "Jackson" } };
    });
    const authorizerData = { profile: "123" };
    let result;
    const expected = {
      profileStatus: Constants.CONNECTION_ACTIVE,
      profileType: "patient",
      loggedinId: "123",
      displayName: "Jackson, Sam"
    };
    try {
      result = await DataFetch.fetchUserProfileInformationFromAuthorizer(authorizerData);
    } catch (err) {
      result = err;
    }
    expect(result.profileStatus).toEqual(expected.profileStatus);
    expect(result.profileType).toEqual(expected.profileType);
    expect(result.displayName).toEqual(expected.displayName);
    expect(result.loggedinId).toEqual(expected.loggedinId);
    done();
  });
});
