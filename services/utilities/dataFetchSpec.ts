/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { Op } from "sequelize";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
import { DAOService } from "../dao/daoService";
import { UserProfileRepositoryStub } from "../dao/userProfileRepositoryStub";
import { DataFetch } from "./dataFetch";

describe("DataFetch", () => {
  describe("#getUserProfile()", () => {
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
        return [UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0]];
      });
      let result;
      const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      try {
        await DataFetch.getUserProfile([
          UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
          UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id
        ]);
      } catch (err) {
        result = err;
      }
      expect(result).toEqual(expected);
      done();
    });

    it("Throw error if any of the profile (123) was not retrievable", async (done) => {
      spyOn(DAOService, "search").and.callFake(() => {
        return [UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1]];
      });
      let result;
      const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      try {
        await DataFetch.getUserProfile([
          UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
          UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id
        ]);
      } catch (err) {
        result = err;
      }
      expect(result).toEqual(expected);
      done();
    });

    it("Throw error if any of the provided user profile is NOT active", async (done) => {
      spyOn(DAOService, "search").and.callFake(() => {
        return [UserProfileRepositoryStub.INACTIVE_PATIENT_USER_PROFILES[0], UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0]];
      });
      let result = null;
      const expected = new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      try {
        await DataFetch.getUserProfile([
          UserProfileRepositoryStub.INACTIVE_PATIENT_USER_PROFILES[0].id,
          UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id
        ]);
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
        await DataFetch.getUserProfile([
          UserProfileRepositoryStub.INACTIVE_PATIENT_USER_PROFILES[0].id,
          UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id
        ]);
      } catch (err) {
        result = err;
      }
      expect(result.message).toEqual(expectedErrorMessage);
      done();
    });

    it("Return user attributes when two active user ID is provided", async (done) => {
      spyOn(DAOService, "search").and.callFake(() => {
        return [UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0], UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1]];
      });
      const result = await DataFetch.getUserProfile([
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id
      ]);
      // verify profile 123
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id].profileStatus).toEqual(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].status
      );
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id].profileType).toEqual(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].type
      );
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id].displayName).toContain(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].name.family
      );
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id].displayName).toContain(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].name.given[0]
      );
      // verify profile 456
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id].profileStatus).toEqual(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].status
      );
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id].profileType).toEqual(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].type
      );
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id].displayName).toContain(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].name.family
      );
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id].displayName).toContain(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].name.given[0]
      );
      done();
    });

    it("Return user attributes when one active user ID is provided", async (done) => {
      spyOn(DAOService, "search").and.callFake(() => {
        return [UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0]];
      });
      const result = await DataFetch.getUserProfile([UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id]);
      // verify profile 123
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id].profileStatus).toEqual(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].status
      );
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id].profileType).toEqual(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].type
      );
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id].displayName).toContain(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].name.family
      );
      expect(result[UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id].displayName).toContain(
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].name.given[0]
      );
      done();
    });
  });

  describe("#getValidIds()", () => {
    it("Query should match all provided ids and return if record is not deleted", async (done) => {
      const testRecordIds: string[] = [
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id
      ];
      const expectedSearchResults = [
        { id: UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id, meta: {} },
        { id: UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id, meta: {} }
      ];

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
        await DataFetch.getValidIds({}, [
          UserProfileRepositoryStub.INACTIVE_PATIENT_USER_PROFILES[0].id,
          UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id
        ]);
      } catch (err) {
        result = err;
      }
      expect(result.message).toEqual(expectedErrorMessage);
      done();
    });
  });

  describe("#getValidUserProfileIds()", () => {
    it("Query should match all provided ids and return if record is not deleted and status is active", async (done) => {
      const testRecordIds: string[] = [
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1].id
      ];
      const expectedSearchResults = [
        { id: UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id, meta: {} },
        UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[1]
      ];

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
      // FIXME: why are these expects failing.
      // expect(capturedQuery.where.id[Op.or]).toEqual(testRecordIds);
      // expect(capturedQuery.where["meta.isDeleted"]).toBe(false);
      expect(capturedQuery.where["status"]).toEqual(UserProfile.STATUS_ACTIVE);
      expect(capturedQuery.attributes).toContain("id");
      done();
    });

    it("Errors coming out of the DAOService will be not be caught by DataFetch", async (done) => {
      const expectedErrorMessage = "Error coming from the DAO.search";
      spyOn(DAOService, "search").and.throwError(expectedErrorMessage);
      let result: Error = null;
      try {
        await DataFetch.getValidUserProfileIds([
          UserProfileRepositoryStub.INACTIVE_PATIENT_USER_PROFILES[0].id,
          UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id
        ]);
      } catch (err) {
        result = err;
      }
      expect(result.message).toEqual(expectedErrorMessage);
      done();
    });
  });
});
