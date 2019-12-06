/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { DAOService } from "../dao/daoService";
import { DataFetch } from "../utilities/dataFetch";
import { RequestValidator } from "./requestValidator";

describe("RequestValidator", () => {
  describe("#validateBundleTotal()", () => {
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

  describe("#validateBundlePostLimit()", () => {
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

  describe("#validateDeviceIds()", () => {
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
      spyOn(DAOService, "recordsCount").and.callFake(() => {
        return 0;
      });
      const deviceIds = ["123"];
      let result;
      const expected = new BadRequestResult(errorCodeMap.InvalidReference.value, errorCodeMap.InvalidReference.description + Constants.DEVICE_REFERENCE_KEY);
      try {
        await RequestValidator.validateDeviceIds(deviceIds);
      } catch (err) {
        result = err;
      }
      expect(result).toEqual(expected);
      done();
    });
    it("No error is returned if unique device id is passed which is present in db", async (done) => {
      spyOn(DAOService, "recordsCount").and.callFake(() => {
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

  describe("#validateLength()", () => {
    it("Should throw BadRequestResult error if the length of ids array does not match the required length.", (done) => {
      const testIds = ["1", "2"];
      const requiredLength = 3;
      const expectedError = new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
      try {
        RequestValidator.validateLength(testIds, requiredLength);
      } catch (err) {
        expect(err).toEqual(expectedError);
        done();
        return;
      }
      done.fail("Should have thrown the BadRequestResult error.");
    });

    it("Should throw BadRequestResult error if the length of ids array does not match the required length as zero.", (done) => {
      const testIds = ["1", "2"];
      const requiredLength = 0;
      const expectedError = new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
      try {
        RequestValidator.validateLength(testIds, requiredLength);
      } catch (err) {
        expect(err).toEqual(expectedError);
        done();
        return;
      }
      done.fail("Should have thrown the BadRequestResult error.");
    });

    it("Validates correctly if exactly one patient reference is provided", (done) => {
      const testIds = ["1"];
      const requiredLength = 1;
      let result = null;
      const expected = null;
      try {
        RequestValidator.validateLength(testIds, requiredLength);
      } catch (err) {
        result = err;
      }
      expect(result).toEqual(expected);
      done();
    });
  });

  describe("#validateSingularUserReference()", () => {
    const reference = Constants.INDIVIDUAL + "." + Constants.REFERENCE_ATTRIBUTE;
    it("Should throw BadRequestResult error if more than one patient references are provided", async (done) => {
      spyOn(DataFetch, "getUserProfiles").and.callFake(() => {
        return [{ [reference]: "1" }, { [reference]: "2" }];
      });
      const patientReferenceId = ["1", "2"];
      const expectedError = new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
      try {
        RequestValidator.validateSingularUserReference(patientReferenceId);
      } catch (err) {
        expect(err).toEqual(expectedError);
        done();
        return;
      }
      done.fail("Should have thrown the BadRequestResult error.");
    });

    it("Should throw BadRequestResult error if more than one patient references are provided even if all the same", async (done) => {
      spyOn(DataFetch, "getUserProfiles").and.callFake(() => {
        return [{ [reference]: "1" }, { [reference]: "2" }];
      });
      const patientReferenceId = ["1", "1"];
      const expectedError = new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
      try {
        RequestValidator.validateSingularUserReference(patientReferenceId);
      } catch (err) {
        expect(err).toEqual(expectedError, "This failed");
        done();
        return;
      }
      done.fail("Should have thrown the BadRequestResult error.");
    });

    it("Should throw BadRequestResult error if no patient references are provided", async (done) => {
      spyOn(DataFetch, "getUserProfiles").and.callFake(() => {
        return [{ [reference]: "1" }, { [reference]: "2" }];
      });
      const patientReferenceId = [];
      const expectedError = new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
      try {
        RequestValidator.validateSingularUserReference(patientReferenceId);
      } catch (err) {
        expect(err).toEqual(expectedError, "This failed");
        done();
        return;
      }
      done.fail("Should have thrown the BadRequestResult error.");
    });

    it("Validates correctly if exactly one patient reference is provided", async (done) => {
      spyOn(DataFetch, "getUserProfiles").and.callFake(() => {
        return [{ [reference]: "1" }];
      });
      const patientReference = ["UserProfile/1"];
      let result = null;
      const expected = null;
      try {
        RequestValidator.validateSingularUserReference(patientReference);
      } catch (err) {
        result = err;
      }
      expect(result).toEqual(expected);
      done();
    });
  });

  describe("#validateNumberOfUniqueUserReference()", () => {
    const reference = Constants.INDIVIDUAL + "." + Constants.REFERENCE_ATTRIBUTE;
    it("Throw error user reference id are more than 1", async (done) => {
      spyOn(DataFetch, "getUserProfiles").and.callFake(() => {
        return [{ [reference]: "1" }];
      });
      const userReferenceId = ["1", "2"];
      let result;
      const expected = new BadRequestResult(errorCodeMap.InvalidBundle.value, errorCodeMap.InvalidBundle.description);
      try {
        RequestValidator.validateSingularUserReference(userReferenceId);
      } catch (err) {
        result = err;
      }
      expect(result).toEqual(expected);
      done();
    });
    it("No error is thrown if patient reference are unique", async (done) => {
      spyOn(DataFetch, "getUserProfiles").and.callFake(() => {
        return [{ [reference]: "1" }];
      });
      const userReference = ["UserProfile/1"];
      let result = null;
      const expected = null;
      try {
        RequestValidator.validateSingularUserReference(userReference);
      } catch (err) {
        result = err;
      }
      expect(result).toEqual(expected);
      done();
    });
  });
});
