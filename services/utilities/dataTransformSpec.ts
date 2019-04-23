import "jasmine";
import { DataTransform } from "./dataTransform";

describe("Test getRecordMetaData() - ", () => {
  it("Populate record meta data as per provided user details", async (done) => {
    const record = {};

    const result = DataTransform.getRecordMetaData(record, "1", "2");

    expect(result.versionId).toEqual(1);
    expect(result.createdBy).toEqual("1");
    expect(result.lastUpdatedBy).toEqual("2");
    expect(result.isDeleted).toEqual(false);
    expect(result.clientRequestId).toEqual(undefined);
    expect(result.deviceId).toEqual(undefined);
    expect(result.source).toEqual(undefined);
    done();
  });
  it("Populate record meta data as per provided user details taking input meta in consideration", async (done) => {
    const record = { meta: { clientRequestId: "123", deviceId: "456", source: "mobile" } };
    const result = DataTransform.getRecordMetaData(record, "1", "2");
    expect(result.versionId).toEqual(1);
    expect(result.createdBy).toEqual("1");
    expect(result.lastUpdatedBy).toEqual("2");
    expect(result.isDeleted).toEqual(false);
    expect(result.clientRequestId).toEqual("123");
    expect(result.deviceId).toEqual("456");
    expect(result.source).toEqual("mobile");
    done();
  });
});
