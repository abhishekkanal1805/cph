/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { DataTransform } from "./dataTransform";

// TODO: test the convertToModel
describe("DataTransform", () => {
  describe("#getRecordMetaData()", () => {
    it("Construct record meta data as per provided user details", async (done) => {
      const testCreatedByUserId = "1";
      const testUpdatedByUserId = "2";
      const record = {};
      const metaData = {
        createdBy: testCreatedByUserId,
        lastUpdatedBy: testUpdatedByUserId,
        requestLogRef: "requestContext_requestId.context_awsRequestId"
      };
      const result = DataTransform.getRecordMetaData(record, metaData);

      // verifying the create meta
      expect(result.versionId).toEqual(1);
      expect(result.createdBy).toEqual(testCreatedByUserId);
      expect(result.lastUpdatedBy).toEqual(testUpdatedByUserId);
      expect(result.isDeleted).toEqual(false);
      expect(result.clientRequestId).toBeUndefined();
      expect(result.deviceId).toBeUndefined();
      expect(result.source).toBeUndefined();
      expect(result.created).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
      expect(result.created).toEqual(result.lastUpdated);
      done();
    });

    it("Construct record meta data as per provided user details taking input meta in consideration", async (done) => {
      const testCreatedByUserId = "1";
      const testUpdatedByUserId = "2";
      const testProvidedMeta = { clientRequestId: "123", deviceId: "456", source: "mobile", created: "12235" };
      const record = { meta: testProvidedMeta };
      const metaData = {
        createdBy: testCreatedByUserId,
        lastUpdatedBy: testUpdatedByUserId,
        requestLogRef: "requestContext_requestId.context_awsRequestId"
      };
      const result = DataTransform.getRecordMetaData(record, metaData);

      // verifying the create meta
      expect(result.versionId).toEqual(1);
      expect(result.createdBy).toEqual(testCreatedByUserId);
      expect(result.lastUpdatedBy).toEqual(testUpdatedByUserId);
      expect(result.isDeleted).toEqual(false);
      expect(result.clientRequestId).toEqual(testProvidedMeta.clientRequestId);
      expect(result.deviceId).toEqual(testProvidedMeta.deviceId);
      expect(result.source).toEqual(testProvidedMeta.source);
      expect(result.created).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
      expect(result.created).toEqual(result.lastUpdated);
      done();
    });
  });

  describe("#getUpdateMetaData()", () => {
    it("Populate record meta data as per provided updated record", async (done) => {
      const updateRecordToBeDeleted = false;
      const newUpdatedByUserId = "user2";
      const existingRecordVersion = 20;
      const existingProvidedMeta = {
        versionId: existingRecordVersion,
        clientRequestId: "111",
        deviceId: "11",
        source: "mobile",
        created: "1110111",
        lastUpdated: "2110111",
        createdBy: "createdByUserId",
        lastUpdatedBy: newUpdatedByUserId,
        isDeleted: false
      };
      const updatedMeta = { lastUpdatedBy: "prevUpdatedByUserId", clientRequestId: "222", deviceId: "22", source: "mobile", created: "2220222" };
      const updatedRecord = { meta: updatedMeta };
      const result = DataTransform.getUpdateMetaData(updatedRecord, existingProvidedMeta);

      // verify the fields retained from existing
      expect(result.created).toEqual(existingProvidedMeta.created);
      expect(result.createdBy).toEqual(existingProvidedMeta.createdBy);
      // verify the updated fields are overriding existing values when applicable
      expect(result.versionId).toEqual(existingRecordVersion + 1);
      expect(result.lastUpdated !== existingProvidedMeta.lastUpdated).toEqual(true);
      expect(result.lastUpdatedBy).toEqual(newUpdatedByUserId);
      expect(result.isDeleted).toEqual(updateRecordToBeDeleted);
      expect(result.clientRequestId).toEqual(updatedMeta.clientRequestId);
      expect(result.deviceId).toEqual(updatedMeta.deviceId);
      expect(result.source).toEqual(updatedMeta.source);
      done();
    });

    it("Populate record meta data from existing record if deviceId, source and clientRequestId are missing in updated record.", async (done) => {
      const updateRecordToBeDeleted = true;
      const newUpdatedByUserId = "user2";
      const existingRecordVersion = 20;
      const existingProvidedMeta = {
        versionId: existingRecordVersion,
        clientRequestId: "111",
        deviceId: "11",
        source: "mobile",
        created: "1110111",
        lastUpdated: "2110111",
        createdBy: "createdByUserId",
        lastUpdatedBy: newUpdatedByUserId,
        isDeleted: true
      };
      const updatedMeta = {};
      const updatedRecord = { meta: updatedMeta };

      const result = DataTransform.getUpdateMetaData(updatedRecord, existingProvidedMeta);

      // verify the fields retained from existing
      expect(result.created).toEqual(existingProvidedMeta.created);
      expect(result.createdBy).toEqual(existingProvidedMeta.createdBy);
      // verify the updated fields are overriding existing values when applicable
      expect(result.versionId).toEqual(existingRecordVersion + 1);
      expect(result.lastUpdated !== existingProvidedMeta.lastUpdated).toEqual(true);
      expect(result.lastUpdatedBy).toEqual(newUpdatedByUserId);
      expect(result.isDeleted).toEqual(updateRecordToBeDeleted);
      expect(result.clientRequestId).toEqual(existingProvidedMeta.clientRequestId);
      expect(result.deviceId).toEqual(existingProvidedMeta.deviceId);
      expect(result.source).toEqual(existingProvidedMeta.source);
      done();
    });
  });
});
