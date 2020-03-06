/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { DAOService } from "../dao/daoService";
import { UserProfileRepositoryStub } from "../dao/userProfileRepositoryStub";
import { DataFetch } from "../utilities/dataFetch";
import { DataFetchStub } from "../utilities/dataFetchStub";
import { AuthorizationRequest } from "./authorizationRequest";
import { AuthService } from "./authService";

const expectedError: Error = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);

describe("AuthService", () => {
  describe("#hasConnectionBasedAccess()", () => {
    beforeEach(() => {
      spyOn(AuthService, "getResourceAccessLevel").and.callFake(() => {
        return false;
      });
    });
    it("Do not allow access if DataFetch throws ForbiddenResult error", async (done) => {
      // dataFetch can throw ForbiddenResult error when it invalidates the provided IDs
      spyOn(DataFetch, "getUserProfile").and.callFake(() => {
        throw expectedError;
      });

      try {
        await AuthService.authorizeConnectionBased("any_id", "any_id", null, Constants.ACCESS_READ);
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
        await AuthService.authorizeConnectionBased("any_id", "any_id", null, Constants.ACCESS_READ);
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
      spyOn(AuthService, "getResearchSubjectProfiles").and.callFake(() => {
        // does not matter what this returns as long as error is not thrown
        return { [testProfile.id]: Constants.USERPROFILE_REFERENCE + testProfile.id };
      });

      try {
        await AuthService.authorizeConnectionBased(testProfile.id, testProfile.id, null, Constants.ACCESS_READ);
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
        await AuthService.authorizeConnectionBased(requesterProfile.id, requesteeProfile.id, null, Constants.ACCESS_READ);
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
        await AuthService.authorizeConnectionBased(requesterProfile.id, requesteeProfile.id, null, Constants.ACCESS_READ);
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
        await AuthService.authorizeConnectionBased(requesterProfile.id, requesteeProfile.id, null, Constants.ACCESS_READ);
      } catch (err) {
        expect(err).toEqual(expectedError);
        done();
        return;
      }
      done.fail("Should have thrown a Forbidden error");
    });
  });
  describe("#authorizeRequest()", () => {
    beforeEach(() => {
      spyOn(AuthService, "getResourceAccessLevel").and.callFake(() => {
        return false;
      });
    });
    it("Do not allow access if DataFetch throws ForbiddenResult error", async (done) => {
      spyOn(DataFetch, "getUserProfile").and.callFake(() => {
        throw expectedError;
      });

      try {
        // the provided id/references need to match ones expected to be returned by the mocked DataFetch
        await AuthService.authorizeRequest("pqr", "UserProfile/abc", "UserProfile/xyz", null, Constants.ACCESS_READ);
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
        await AuthService.authorizeRequest("pqr", "UserProfile/abc", "UserProfile/xyz", null, Constants.ACCESS_READ);
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
        await AuthService.authorizeRequest(
          "any",
          "UserProfile/dontcare",
          "UserProfile/" + testPatientOwnerProfile.id,
          null,
          Constants.ACCESS_READ,
          allowedOwnerType
        );
      } catch (err) {
        actualError = err;
      }
      expect(actualError).toEqual(expectedError);

      // test 2, System owner will be forbidden
      try {
        // the provided args dont matter as we are mocking the DataFetch behavior
        await AuthService.authorizeRequest(
          "any",
          "UserProfile/dontcare",
          "UserProfile/" + testSystemOwnerProfile.id,
          null,
          Constants.ACCESS_READ,
          allowedOwnerType
        );
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
      const testCarePartnerOwnerProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
      spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testPractitionerOwnerProfile, testCarePartnerOwnerProfile));
      // test 1, Practitioner owner will be forbidden
      let actualError;
      try {
        // the provided id/references need to match ones returned by the mocked DataFetch
        await AuthService.authorizeRequest(
          "any",
          "UserProfile/dontcare",
          "UserProfile/" + testPractitionerOwnerProfile.id,
          null,
          Constants.ACCESS_READ,
          allowedOwnerType
        );
      } catch (err) {
        actualError = err;
      }
      expect(actualError).toEqual(expectedError);

      // test 2, System owner will be forbidden
      try {
        // the provided id/references need to match ones expected to be returned by the mocked DataFetch
        await AuthService.authorizeRequest(
          "any",
          "UserProfile/dontcare",
          "UserProfile/" + testCarePartnerOwnerProfile.id,
          null,
          Constants.ACCESS_READ,
          allowedOwnerType
        );
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
        await AuthService.authorizeRequest(
          testOwnerProfile.id,
          "UserProfile/" + testOwnerProfile.id,
          "UserProfile/" + testOwnerProfile.id,
          null,
          Constants.ACCESS_READ
        );
      } catch (err) {
        done.fail("Unexpected error thrown: " + err.message);
      }
      done();
    });

    it("Do not allow access if provided profiles are valid, owner submitting his own record but owner's user type does not match the provided one", async (done) => {
      const allowedOwnerType = Constants.PATIENT_USER;
      const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
      spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile));

      try {
        // the provided id/references need to match ones returned by the mocked DataFetch
        await AuthService.authorizeRequest(
          testOwnerProfile.id,
          "UserProfile/" + testOwnerProfile.id,
          "UserProfile/" + testOwnerProfile.id,
          null,
          Constants.ACCESS_READ,
          allowedOwnerType
        );
      } catch (err) {
        expect(err).toEqual(expectedError);
        done();
        return;
      }
      done.fail("Should have thrown an internal error.");
    });

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource " +
        "and requester's profileType is unknown or unsupported",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testRequesterProfile = { id: "999", type: "UNSUPPORTED" };
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));

        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          await AuthService.authorizeRequest(
            testRequesterProfile.id,
            "UserProfile/" + testInformationSourceProfile.id,
            "UserProfile/" + testOwnerProfile.id,
            null,
            Constants.ACCESS_READ
          );
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done.fail("Should have thrown an internal error.");
      }
    );

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource or a System user," +
        "and informationSource user is not careparter or practitioner.",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          await AuthService.authorizeRequest(
            testRequesterProfile.id,
            "UserProfile/" + testInformationSourceProfile.id,
            "UserProfile/" + testOwnerProfile.id,
            null,
            Constants.ACCESS_READ
          );
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done.fail("Should have thrown an internal error.");
      }
    );

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource or a System user," +
        "and informationSource user is practitioner but not the same as requester.",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[1];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          await AuthService.authorizeRequest(
            testRequesterProfile.id,
            "UserProfile/" + testInformationSourceProfile.id,
            "UserProfile/" + testOwnerProfile.id,
            null,
            Constants.ACCESS_READ
          );
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done.fail("Should have thrown an internal error.");
      }
    );

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource or a System user," +
        "and informationSource user is carepartner but not the same as requester.",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          await AuthService.authorizeRequest(
            testRequesterProfile.id,
            "UserProfile/" + testInformationSourceProfile.id,
            "UserProfile/" + testOwnerProfile.id,
            null,
            Constants.ACCESS_READ
          );
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done.fail("Should have thrown an internal error.");
      }
    );

    it(
      "Allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
        "but informationSource is practitioner and same as requester and has connection to the owner",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        // hasConnection has to return any array size>0 to prove valid connection. object inside array is not checked
        spyOn(AuthService, "hasConnection").and.returnValue([{}]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          await AuthService.authorizeRequest(
            testRequesterProfile.id,
            "UserProfile/" + testInformationSourceProfile.id,
            "UserProfile/" + testOwnerProfile.id,
            null,
            Constants.ACCESS_READ
          );
        } catch (err) {
          done.fail("Unexpected error thrown: " + err.message);
        }
        done();
      }
    );

    it(
      "Allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
        "but informationSource is carepartner and same as requester and has connection to the owner",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        // hasConnection has to return any array size>0 to prove valid connection. object inside array is not checked
        spyOn(AuthService, "hasConnection").and.returnValue([{}]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          await AuthService.authorizeRequest(
            testRequesterProfile.id,
            "UserProfile/" + testInformationSourceProfile.id,
            "UserProfile/" + testOwnerProfile.id,
            null,
            Constants.ACCESS_READ
          );
        } catch (err) {
          done.fail("Unexpected error thrown: " + err.message);
        }
        done();
      }
    );

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
        "but informationSource is practitioner and same as requester but has no connection to the owner",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        // hasConnection has to return any array size=0 to prove no connection
        spyOn(AuthService, "hasConnection").and.returnValue([]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          await AuthService.authorizeRequest(
            testRequesterProfile.id,
            "UserProfile/" + testInformationSourceProfile.id,
            "UserProfile/" + testOwnerProfile.id,
            null,
            Constants.ACCESS_READ
          );
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done.fail("Should have thrown an internal error.");
      }
    );

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
        "but informationSource is carepartner and same as requester but has no connection to the owner",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        // hasConnection has to return any array size=0 to prove no connection
        spyOn(AuthService, "hasConnection").and.returnValue([]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          await AuthService.authorizeRequest(
            testRequesterProfile.id,
            "UserProfile/" + testInformationSourceProfile.id,
            "UserProfile/" + testOwnerProfile.id,
            null,
            Constants.ACCESS_READ
          );
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done.fail("Should have thrown an internal error.");
      }
    );

    it("Allow access if provided profiles are valid, requester is not the owner or informationSource but requester's profileType is System", async (done) => {
      const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
      const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
      const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_SYSTEM_USER_PROFILES[0];
      spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));

      try {
        // the provided id/references need to match ones returned by the mocked DataFetch
        await AuthService.authorizeRequest(
          testRequesterProfile.id,
          "UserProfile/" + testInformationSourceProfile.id,
          "UserProfile/" + testOwnerProfile.id,
          null,
          Constants.ACCESS_READ
        );
      } catch (err) {
        done.fail("Unexpected error thrown: " + err.message);
      }
      done();
    });
  });
  describe("#hasConnection()", () => {
    beforeEach(() => {
      spyOn(AuthService, "getResourceAccessLevel").and.callFake(() => {
        return false;
      });
    });
    it("Should throw the error if the DAO does.", async (done) => {
      const expectedErrorMessage = "any internal error";
      spyOn(DAOService, "search").and.throwError(expectedErrorMessage);

      try {
        // the provided id/references need to match ones expected to be returned by the mocked DataFetch
        await AuthService.hasConnection("pqr", "UserProfile/abc", [], []);
      } catch (err) {
        expect(err.message).toEqual(expectedErrorMessage);
        done();
        return;
      }
      done.fail("Should have thrown a Forbidden error.");
    });

    it("Should accept the to and from as profile ids.", async (done) => {
      const testToId = "anyprofilereference";
      const testFromId = "anyprofilereference";
      const testProfileTypes: string[] = [Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
      const testConnectionStatuses: string[] = [Constants.ACTIVE];
      const expectedConnectionResource = { id: "1111", resourceType: "Connection", type: Constants.CAREPARTNER_USER };
      const expectedSearchResult = [{ dataResource: expectedConnectionResource }];

      let capturedQueryOptions;
      spyOn(DAOService, "search").and.callFake((model, queryOptions) => {
        capturedQueryOptions = queryOptions;
        return expectedSearchResult;
      });

      try {
        // the provided id/references need to match ones expected to be returned by the mocked DataFetch
        const result = await AuthService.hasConnection(testToId, testFromId, testProfileTypes, testConnectionStatuses);
        // verify that the provided params are used in query options
        expect(capturedQueryOptions.where.from.reference).toBe(Constants.USERPROFILE_REFERENCE + testToId);
        expect(capturedQueryOptions.where.from.reference).toBe(Constants.USERPROFILE_REFERENCE + testToId);
        expect(capturedQueryOptions.where.type).toBe(testProfileTypes);
        expect(capturedQueryOptions.where.status).toBe(testConnectionStatuses);
        expect(result).toEqual([expectedConnectionResource]);
      } catch (err) {
        done.fail("Unexpected error thrown: " + err.message);
      }
      done();
    });

    it("Should accept the to and from as profile references.", async (done) => {
      const testToReference = "UserProfile/anyprofilereference";
      const testFromReference = "UserProfile/anyprofilereference";
      const testProfileTypes: string[] = [Constants.CONNECTION_TYPE_PARTNER, Constants.CONNECTION_TYPE_DELIGATE];
      const testConnectionStatuses: string[] = [Constants.ACTIVE];
      const expectedConnectionResource = { id: "1111", resourceType: "Connection", type: Constants.CAREPARTNER_USER };
      const expectedSearchResult = [{ dataResource: expectedConnectionResource }];

      let capturedQueryOptions;
      spyOn(DAOService, "search").and.callFake((model, queryOptions) => {
        capturedQueryOptions = queryOptions;
        return expectedSearchResult;
      });

      try {
        // the provided id/references need to match ones expected to be returned by the mocked DataFetch
        const result = await AuthService.hasConnection(testToReference, testFromReference, testProfileTypes, testConnectionStatuses);
        // verify that the provided params are used in query options
        expect(capturedQueryOptions.where.to.reference).toBe(testToReference);
        expect(capturedQueryOptions.where.to.reference).toBe(testFromReference);
        expect(capturedQueryOptions.where.type).toBe(testProfileTypes);
        expect(capturedQueryOptions.where.status).toBe(testConnectionStatuses);
        expect(result).toEqual([expectedConnectionResource]);
      } catch (err) {
        done.fail("Unexpected error thrown: " + err.message);
      }
      done();
    });
  });
  describe("#authorizeRequestSharingRules()", () => {
    beforeEach(() => {
      spyOn(AuthService, "getResourceAccessLevel").and.callFake(() => {
        return false;
      });
    });
    it("Do not allow access if DataFetch throws ForbiddenResult error", async (done) => {
      spyOn(DataFetch, "getUserProfile").and.callFake(() => {
        throw expectedError;
      });

      try {
        // the provided id/references need to match ones expected to be returned by the mocked DataFetch
        const testAuthRequest: AuthorizationRequest = {
          requester: "pqr",
          informationSourceReference: "UserProfile/abc",
          ownerReference: "UserProfile/xyz",
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
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
        const testAuthRequest: AuthorizationRequest = {
          requester: "pqr",
          informationSourceReference: "UserProfile/abc",
          ownerReference: "UserProfile/xyz",
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
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
      const testCarePartnerOwnerProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
      spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testPatientOwnerProfile, testCarePartnerOwnerProfile));

      // test 1, Patient owner will be forbidden
      let actualError;
      try {
        // the provided id/references need to match ones expected to be returned by the mocked DataFetch
        const testAuthRequest: AuthorizationRequest = {
          requester: "any",
          informationSourceReference: "UserProfile/dontcare",
          ownerReference: "UserProfile/" + testPatientOwnerProfile.id,
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ,
          ownerType: allowedOwnerType
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
      } catch (err) {
        actualError = err;
      }
      expect(actualError).toEqual(expectedError);

      // test 2, System owner will be forbidden
      try {
        // the provided args dont matter as we are mocking the DataFetch behavior
        const testAuthRequest: AuthorizationRequest = {
          requester: "any",
          informationSourceReference: "UserProfile/dontcare",
          ownerReference: "UserProfile/" + testCarePartnerOwnerProfile.id,
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ,
          ownerType: allowedOwnerType
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
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
      const testCarePartnerOwnerProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
      spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testPractitionerOwnerProfile, testCarePartnerOwnerProfile));

      // test 1, Practitioner owner will be forbidden
      let actualError;
      try {
        // the provided id/references need to match ones returned by the mocked DataFetch
        const testAuthRequest: AuthorizationRequest = {
          requester: "any",
          informationSourceReference: "UserProfile/dontcare",
          ownerReference: "UserProfile/" + testPractitionerOwnerProfile.id,
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ,
          ownerType: allowedOwnerType
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
      } catch (err) {
        actualError = err;
      }
      expect(actualError).toEqual(expectedError);

      // test 2, System owner will be forbidden
      try {
        // the provided id/references need to match ones expected to be returned by the mocked DataFetch
        const testAuthRequest: AuthorizationRequest = {
          requester: "any",
          informationSourceReference: "UserProfile/dontcare",
          ownerReference: "UserProfile/" + testCarePartnerOwnerProfile.id,
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ,
          ownerType: allowedOwnerType
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
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
        const testAuthRequest: AuthorizationRequest = {
          requester: testOwnerProfile.id,
          informationSourceReference: "UserProfile/" + testOwnerProfile.id,
          ownerReference: "UserProfile/" + testOwnerProfile.id,
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
      } catch (err) {
        done.fail("Unexpected error thrown: " + err.message);
      }
      done();
    });

    it("Do not allow access if provided profiles are valid, owner submitting his own record but owner's user type does not match the provided one", async (done) => {
      const allowedOwnerType = Constants.PATIENT_USER;
      const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
      spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile));

      try {
        // the provided id/references need to match ones returned by the mocked DataFetch
        const testAuthRequest: AuthorizationRequest = {
          requester: testOwnerProfile.id,
          informationSourceReference: "UserProfile/" + testOwnerProfile.id,
          ownerReference: "UserProfile/" + testOwnerProfile.id,
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ,
          ownerType: allowedOwnerType
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
      } catch (err) {
        expect(err).toEqual(expectedError);
        done();
        return;
      }
      done.fail("Should have thrown an internal error.");
    });
    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource " +
        "and requester's profileType is unknown or unsupported",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testRequesterProfile = { id: "999", type: "UNSUPPORTED" };

        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        spyOn(AuthService, "hasConnection").and.returnValue([{}]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          const testAuthRequest: AuthorizationRequest = {
            requester: testRequesterProfile.id,
            informationSourceReference: "UserProfile/" + testInformationSourceProfile.id,
            ownerReference: "UserProfile/" + testOwnerProfile.id,
            resourceType: null,
            resourceActions: null,
            accessType: Constants.ACCESS_READ
          };
          await AuthService.authorizeRequestSharingRules(testAuthRequest);
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done();
      }
    );

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource or a System user," +
        "and informationSource user is practitioner but not the same as requester.",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[1];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        spyOn(AuthService, "hasConnection").and.returnValue([{}]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          const testAuthRequest: AuthorizationRequest = {
            requester: testRequesterProfile.id,
            informationSourceReference: "UserProfile/" + testInformationSourceProfile.id,
            ownerReference: "UserProfile/" + testOwnerProfile.id,
            resourceType: null,
            resourceActions: null,
            accessType: Constants.ACCESS_READ
          };
          await AuthService.authorizeRequestSharingRules(testAuthRequest);
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done();
      }
    );

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource or a System user," +
        "and informationSource user is carepartner but not the same as requester.",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        spyOn(AuthService, "hasConnection").and.returnValue([{}]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          const testAuthRequest: AuthorizationRequest = {
            requester: testRequesterProfile.id,
            informationSourceReference: "UserProfile/" + testInformationSourceProfile.id,
            ownerReference: "UserProfile/" + testOwnerProfile.id,
            resourceType: null,
            resourceActions: null,
            accessType: Constants.ACCESS_READ
          };
          await AuthService.authorizeRequestSharingRules(testAuthRequest);
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done();
      }
    );

    it(
      "Allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
        "but informationSource is practitioner and same as requester and has connection to the owner",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        // hasConnection has to return any array size>0 to prove valid connection. object inside array is not checked
        spyOn(AuthService, "hasConnection").and.returnValue([{}]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          const testAuthRequest: AuthorizationRequest = {
            requester: testRequesterProfile.id,
            informationSourceReference: "UserProfile/" + testInformationSourceProfile.id,
            ownerReference: "UserProfile/" + testOwnerProfile.id,
            resourceType: null,
            resourceActions: null,
            accessType: Constants.ACCESS_READ
          };
          await AuthService.authorizeRequestSharingRules(testAuthRequest);
        } catch (err) {
          done.fail("Unexpected error thrown: " + err.message);
        }
        done();
      }
    );

    it(
      "Allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
        "but informationSource is carepartner and same as requester and has connection to the owner",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        // hasConnection has to return any array size>0 to prove valid connection. object inside array is not checked
        spyOn(AuthService, "hasConnection").and.returnValue([{}]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          const testAuthRequest: AuthorizationRequest = {
            requester: testRequesterProfile.id,
            informationSourceReference: "UserProfile/" + testInformationSourceProfile.id,
            ownerReference: "UserProfile/" + testOwnerProfile.id,
            resourceType: null,
            resourceActions: null,
            accessType: Constants.ACCESS_READ
          };
          await AuthService.authorizeRequestSharingRules(testAuthRequest);
        } catch (err) {
          done.fail("Unexpected error thrown: " + err.message);
        }
        done();
      }
    );

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
        "but informationSource is practitioner and same as requester but has no connection to the owner",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        // hasConnection has to return any array size=0 to prove no connection
        spyOn(AuthService, "hasConnection").and.returnValue([]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          const testAuthRequest: AuthorizationRequest = {
            requester: testRequesterProfile.id,
            informationSourceReference: "UserProfile/" + testInformationSourceProfile.id,
            ownerReference: "UserProfile/" + testOwnerProfile.id,
            resourceType: null,
            resourceActions: null,
            accessType: Constants.ACCESS_READ
          };
          await AuthService.authorizeRequestSharingRules(testAuthRequest);
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done.fail("Should have thrown an internal error.");
      }
    );

    it(
      "Do not allow access if provided profiles are valid, requester is not the owner or informationSource or System user " +
        "but informationSource is carepartner and same as requester but has no connection to the owner",
      async (done) => {
        const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
        const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_CAREPARTNER_USER_PROFILES[0];
        spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
        // hasConnection has to return any array size=0 to prove no connection
        spyOn(AuthService, "hasConnection").and.returnValue([]);
        try {
          // the provided id/references need to match ones returned by the mocked DataFetch
          const testAuthRequest: AuthorizationRequest = {
            requester: testRequesterProfile.id,
            informationSourceReference: "UserProfile/" + testInformationSourceProfile.id,
            ownerReference: "UserProfile/" + testOwnerProfile.id,
            resourceType: null,
            resourceActions: null,
            accessType: Constants.ACCESS_READ
          };
          await AuthService.authorizeRequestSharingRules(testAuthRequest);
        } catch (err) {
          expect(err).toEqual(expectedError);
          done();
          return;
        }
        done.fail("Should have thrown an internal error.");
      }
    );

    it("Allow access if provided profiles are valid, requester is not the owner or informationSource but requester's profileType is System", async (done) => {
      const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PRACTITIONER_USER_PROFILES[0];
      const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
      const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_SYSTEM_USER_PROFILES[0];
      spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
      spyOn(AuthService, "validateProfileReferences").and.returnValue([]);

      try {
        // the provided id/references need to match ones returned by the mocked DataFetch
        const testAuthRequest: AuthorizationRequest = {
          requester: testRequesterProfile.id,
          informationSourceReference: "UserProfile/" + testInformationSourceProfile.id,
          ownerReference: "UserProfile/" + testOwnerProfile.id,
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
      } catch (err) {
        done.fail("Unexpected error thrown: " + err.message);
      }
      done();
    });

    it("Allow access if provided profiles are valid, if connection type is friend", async (done) => {
      const testOwnerProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0];
      const testInformationSourceProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1];
      const testRequesterProfile = UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1];
      spyOn(DataFetch, "getUserProfile").and.returnValue(DataFetchStub.getUserAccess(testOwnerProfile, testInformationSourceProfile, testRequesterProfile));
      spyOn(AuthService, "hasConnection").and.callFake(() => {
        // returning any array greater than length one will allow access
        return [{}];
      });

      try {
        // the provided id/references need to match ones returned by the mocked DataFetch
        const testAuthRequest: AuthorizationRequest = {
          requester: testRequesterProfile.id,
          informationSourceReference: "UserProfile/" + testInformationSourceProfile.id,
          ownerReference: "UserProfile/" + testOwnerProfile.id,
          resourceType: null,
          resourceActions: null,
          accessType: Constants.ACCESS_READ
        };
        await AuthService.authorizeRequestSharingRules(testAuthRequest);
      } catch (err) {
        done.fail("Unexpected error thrown: " + err.message);
      }
      done();
    });
  });
});
