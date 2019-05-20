import "jasmine";
import { DataTransform } from "./dataTransform";

describe("Test getRecordMetaData() - ", () => {
  it("Populate record meta data as per provided user details", async (done) => {
    const testCreatedByUserId = "1";
    const testUpdatedByUserId = "2";
    const record = {};
    const result = DataTransform.getRecordMetaData(record, testCreatedByUserId, testUpdatedByUserId);

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

  it("Populate record meta data as per provided user details taking input meta in consideration", async (done) => {
    const testCreatedByUserId = "1";
    const testUpdatedByUserId = "2";
    const testProvidedMeta = { clientRequestId: "123", deviceId: "456", source: "mobile", created: "12235" };
    const record = { meta: testProvidedMeta};
    const result = DataTransform.getRecordMetaData(record, testCreatedByUserId, testUpdatedByUserId);

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
