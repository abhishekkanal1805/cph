/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { Constants } from "../../common/constants/constants";
import { ReferenceUtility } from "./referenceUtility";

describe("ReferenceUtility", () => {
  describe("#getUniqueReferences()", () => {
    it("Only unique references of the expected type should be returned", (done) => {
      const testReferenceType = Constants.RESEARCHSUBJECT_REFERENCE;
      const testData: string[] = [
        "12345",
        testReferenceType + "12345",
        testReferenceType + "12345",
        testReferenceType + "222222",
        testReferenceType + "44444",
        Constants.USERPROFILE_REFERENCE + "55555"
      ];
      const expectedUniqueReferences = 3;

      const result: string[] = ReferenceUtility.getUniqueReferences(testData, testReferenceType);
      // only unique references of the expected type should be returned
      expect(result.length).toEqual(expectedUniqueReferences);
      done();
    });
  });

  describe("#convertToResourceReferences()", () => {
    it("Should convert all values to references", (done) => {
      const testReferenceType = Constants.RESEARCHSUBJECT_REFERENCE;
      const testData: string[] = [
        "12345",
        testReferenceType + "12345",
        testReferenceType + "222222",
        testReferenceType + "44444",
        Constants.USERPROFILE_REFERENCE + "55555"
      ];
      const expectedUniqueReferences = 5;

      const result: string[] = ReferenceUtility.convertToResourceReferences(testData, testReferenceType);
      // only unique references of the expected type should be returned
      expect(result.length).toEqual(expectedUniqueReferences);
      // ID should have been converted
      expect(result[0]).toEqual(testReferenceType + "12345");
      // reference should have been left alone
      expect(result[1]).toEqual(testReferenceType + "12345");
      // another resource reference would be incorrectly converted
      expect(result[4]).toEqual(testReferenceType + Constants.USERPROFILE_REFERENCE + "55555");
      done();
    });
  });

  describe("#convertToResourceIds()", () => {
    it("Should convert all values to ids", (done) => {
      const testReferenceType = Constants.RESEARCHSUBJECT_REFERENCE;
      const testData: string[] = ["12345", testReferenceType + "12345", "222222", testReferenceType + "44444", Constants.USERPROFILE_REFERENCE + "55555"];
      const expectedUniqueReferences = 5;

      const result: string[] = ReferenceUtility.convertToResourceIds(testData, testReferenceType);
      // only unique references of the expected type should be returned
      expect(result.length).toEqual(expectedUniqueReferences);
      // ID should have been left alone
      expect(result[0]).toEqual(testData[0]);
      // reference should have been converted to id
      expect(result[1]).toEqual("12345");
      expect(result[3]).toEqual("44444");
      // another resource reference would be returned as is
      expect(result[4]).toEqual(testData[4]);
      done();
    });
  });
});
