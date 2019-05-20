import "jasmine";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { UserProfileRepositoryStub } from "../dao/userProfileRepositoryStub";
import { DataFetch } from "../utilities/dataFetch";
import { DataFetchStub } from "../utilities/dataFetchStub";
import { AuthService } from "./authService";

const expectedError: Error = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);

describe("Test hasConnectionBasedAccess() - ", () => {
  it("Do not allow access if DataFetch throws ForbiddenResult error", async (done) => {
    // dataFetch can throw ForbiddenResult error when it invalidates the provided IDs
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
    spyOn(DataFetch, "getUserProfile").and.callFake(() => {
      throw expectedError;
    });
    try {
      // the provided id/references need to match ones expected to be returned by the mocked DataFetch
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
      // the provided id/references need to match ones expected to be returned by the mocked DataFetch
      await AuthService.authorizeRequest("pqr", "UserProfile/abc", "UserProfile/xyz");
    } catch (err) {
      expect(err.message).toEqual(unexpectedInternalErrorMsg);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Do not allow access if provided profiles are valid, owner's user type does not match the provided one - only practitioner owner allowed", async (done) => {
    const allowedOwnerType = Constants.PRACTITIONER_USER;
    const testPatientOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    const testSystemOwnerProfile = UserProfileRepositoryStub.ACTIVE_SYSTEM_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValues(
      DataFetchStub.getUserAccess(testPatientOwnerProfile),
      DataFetchStub.getUserAccess(testSystemOwnerProfile)
    );
    // test 1, Patient owner will be forbidden
    let actualError;
    try {
      // the provided id/references need to match ones expected to be returned by the mocked DataFetch
      await AuthService.authorizeRequest("any", "UserProfile/dontcare", "UserProfile/" + testPatientOwnerProfile.id, allowedOwnerType);
    } catch (err) {
      actualError = err;
    }
    expect(actualError).toEqual(expectedError);

    // test 2, System owner will be forbidden
    try {
      // the provided args dont matter as we are mocking the DataFetch behavior
      await AuthService.authorizeRequest("any", "UserProfile/dontcare", "UserProfile/" + testSystemOwnerProfile.id, allowedOwnerType);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Do not allow access if provided profiles are valid, owner's user type does not match the provided one - only patient owner allowed", async (done) => {
    const allowedOwnerType = Constants.PATIENT_USER;
    const testPractitionerOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const testSystemOwnerProfile = UserProfileRepositoryStub.ACTIVE_SYSTEM_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValues(
      DataFetchStub.getUserAccess(testPractitionerOwnerProfile),
      DataFetchStub.getUserAccess(testSystemOwnerProfile)
    );
    // test 1, Practitioner owner will be forbidden
    let actualError;
    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest("any", "UserProfile/dontcare", "UserProfile/" + testPractitionerOwnerProfile.id, allowedOwnerType);
    } catch (err) {
      actualError = err;
    }
    expect(actualError).toEqual(expectedError);

    // test 2, System owner will be forbidden
    try {
      // the provided id/references need to match ones expected to be returned by the mocked DataFetch
      await AuthService.authorizeRequest("any", "UserProfile/dontcare", "UserProfile/" + testSystemOwnerProfile.id, allowedOwnerType);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Allow access if the owner is submitting their own record", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.callFake(() => {
      // the requester profile in access must be present
      return DataFetchStub.getUserAccess(testOwnerProfile);
    });

    try {
      // the provided id/references need to match ones expected to be returned by the mocked DataFetch
      await AuthService.authorizeRequest(testOwnerProfile.id, "UserProfile/" + testOwnerProfile.id, "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      done.fail("Unexpected error thrown: " + err.message);
    }
    done();
  });

  // TODO: review if this behavior is correct and expected
  it("Do not allow access if provided profiles are valid, owner submitting his own record but owner's user type does not match the provided one", async (done) => {
    const allowedOwnerType = Constants.PATIENT_USER;
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile));

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testOwnerProfile.id, "UserProfile/" + testOwnerProfile.id, "UserProfile/" + testOwnerProfile.id, allowedOwnerType);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Do not allow access if provided profiles are valid, requester is not the owner or informationSource and requester's profileType is unknown or unsupported", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    const testRequesterProfile = {id: "999", type: "UNSUPPORTED"};

    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testRequesterProfile.id,
        "UserProfile/" + testInformationSourceProfile.id,
        "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Do not allow access if provided profiles are valid, requester is not the owner or informationSource or a System user," +
    "and informationSource user is not careparter or practitioner.", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testRequesterProfile.id,
        "UserProfile/" + testInformationSourceProfile.id,
        "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Do not allow access if provided profiles are valid, requester is not the owner or informationSource or a System user," +
    "and informationSource user is practitioner but not the same as requester.", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[1];
    const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testRequesterProfile.id,
        "UserProfile/" + testInformationSourceProfile.id,
        "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Do not allow access if provided profiles are valid, requester is not the owner or informationSource or a System user," +
    "and informationSource user is carepartner but not the same as requester.", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
    const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testRequesterProfile.id,
        "UserProfile/" + testInformationSourceProfile.id,
        "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
    "but informationSource is practitioner and same as requester and has connection to the owner", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
    // hasConnection has to return any array size>0 to prove valid connection. object inside array is not checked
    spyOn(AuthService, "hasConnection").and.returnValue([{}]);

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testRequesterProfile.id,
        "UserProfile/" + testInformationSourceProfile.id,
        "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      done.fail("Unexpected error thrown: " + err.message);
    }
    done();
  });

  it("Allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
    "but informationSource is carepartner and same as requester and has connection to the owner", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
    const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
    // hasConnection has to return any array size>0 to prove valid connection. object inside array is not checked
    spyOn(AuthService, "hasConnection").and.returnValue([{}]);

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testRequesterProfile.id,
        "UserProfile/" + testInformationSourceProfile.id,
        "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      done.fail("Unexpected error thrown: " + err.message);
    }
    done();
  });

  it("Do not allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
    "but informationSource is practitioner and same as requester but has no connection to the owner", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
    // hasConnection has to return any array size=0 to prove no connection
    spyOn(AuthService, "hasConnection").and.returnValue([]);

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testRequesterProfile.id,
        "UserProfile/" + testInformationSourceProfile.id,
        "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Do not allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
    "but informationSource is carepartner and same as requester but has no connection to the owner", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
    const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
    // hasConnection has to return any array size=0 to prove no connection
    spyOn(AuthService, "hasConnection").and.returnValue([]);

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testRequesterProfile.id,
        "UserProfile/" + testInformationSourceProfile.id,
        "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      expect(err).toEqual(expectedError);
      done();
      return;
    }
    done.fail("Should have thrown an internal error.");
  });

  it("Allow access if provided profiles are valid, requester is not the owner or informationSource but requester's profileType is System", async (done) => {
    const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
    const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
    const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_SYSTEM_USER_PROFILES[0];
    spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));

    try {
      // the provided id/references need to match ones returned by the mocked DataFetch
      await AuthService.authorizeRequest(testRequesterProfile.id,
        "UserProfile/" + testInformationSourceProfile.id,
        "UserProfile/" + testOwnerProfile.id);
    } catch (err) {
      done.fail("Unexpected error thrown: " + err.message);
    }
    done();
  });
});
