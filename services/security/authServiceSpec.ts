import "jasmine";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { UserProfileRepositoryStub } from "../dao/userProfileRepositoryStub";
import { DataFetch } from "../utilities/dataFetch";
import { DataFetchStub } from "../utilities/dataFetchStub";
import { AuthService } from "./authService";

describe("Test hasConnectionBasedAccess() - ", () => {

  it("Do not allow access if DataFetch throws ForbiddenResult error", async (done) => {
    // dataFetch can throw ForbiddenResult error when it invalidates the provided IDs
    const expectedError: Error = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    spyOn(DataFetch, "getUserProfile").and.callFake(() => {
      throw expectedError;
    });
    try {
      await AuthService.authorizeConnectionBased("any_id", "any_id");
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown a Forbidden error.");
  });

  it("Do not allow access if DataFetch throws unexpected internal error", async (done) => {
    const unexpectedInternalErrorMsg = "unexpectedInternalErrorMsg";
    spyOn(DataFetch, "getUserProfile").and.throwError(unexpectedInternalErrorMsg);
    try {
      await AuthService.authorizeConnectionBased("any_id", "any_id");
    } catch (err) {
      expect(err.message).toEqual(unexpectedInternalErrorMsg);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Allow access if Requester & Requestee are valid profiles and both are the same person", async (done) => {
    // any profile will do
    const testProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.callFake(() => {
      // does not matter what this returns as long as error is not thrown
      return {};
    });

    try {
      await AuthService.authorizeConnectionBased(testProfile.id, testProfile.id);
    } catch (err) {
      done.fail("Unexpected error thrown: " + err.message);
    }
    done();
  });

  it("Allow access if Requester & Requestee are valid profiles and Requester is a system user", async (done) => {
    const requesterProfile = UserProfileRepositoryStub.ACTIVE_SYSTEM_USER_PROFILES[0];
    const requesteeProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.callFake(() => {
      // the requester profile in access must be present
      return DataFetchStub.getUserAccess(requesterProfile, requesteeProfile);
    });
    try {
      await AuthService.authorizeConnectionBased(requesterProfile.id, requesteeProfile.id);
    } catch (err) {
      done.fail("Unexpected error thrown: " + err.message);
    }
    done();
  });

  it("Allow access if Requester & Requestee are valid profiles and Requester is connected to Requestee", async (done) => {
    const requesterProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const requesteeProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.callFake(() => {
      // the requester profile in access must be present
      return DataFetchStub.getUserAccess(requesterProfile, requesteeProfile);
    });
    spyOn(AuthService, "hasConnection").and.callFake(() => {
      // returning any array greater than length one will allow access
      return [{}];
    });
    try {
      await AuthService.authorizeConnectionBased(requesterProfile.id, requesteeProfile.id);
    } catch (err) {
      done.fail("Unexpected error thrown: " + err.message);
    }
    done();
  });

  // checking for the connectionType and status is abstacted out in AuthService.hasConnection and no need to test again
  it("Do not allow access if Requester & Requestee are valid profiles but Requester is NOT connected to Requestee", async (done) => {
    const expectedError: Error = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    const requesterProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const requesteeProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.callFake(() => {
      // the requester profile in access must be present
      return DataFetchStub.getUserAccess(requesterProfile, requesteeProfile);
    });
    spyOn(AuthService, "hasConnection").and.callFake(() => {
      // returning any array greater than length one will allow access
      return [];
    });
    try {
      await AuthService.authorizeConnectionBased(requesterProfile.id, requesteeProfile.id);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown a Forbidden error");
  });

});

describe("Test authorizeRequest() - ", () => {

  it("Do not allow access if DataFetch throws ForbiddenResult error", async (done) => {
    // dataFetch can throw ForbiddenResult error when it invalidates the provided IDs
    const expectedError: Error = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    spyOn(DataFetch, "getUserProfile").and.callFake(() => {
      throw expectedError;
    });
    try {
      // the provided args dont matter as we are mocking the DataFetch behavior
      await AuthService.authorizeRequest("pqr", "UserProfile/abc", "UserProfile/xyz");
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown a Forbidden error.");
  });

  it("Do not allow access if DataFetch throws unexpected internal error", async (done) => {
    const unexpectedInternalErrorMsg = "unexpectedInternalErrorMsg";
    spyOn(DataFetch, "getUserProfile").and.throwError(unexpectedInternalErrorMsg);
    try {
      // the provided args dont matter as we are mocking the DataFetch behavior
      await AuthService.authorizeRequest("pqr", "UserProfile/abc", "UserProfile/xyz");
    } catch (err) {
      expect(err.message).toEqual(unexpectedInternalErrorMsg);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

});
