/**
 * Author: Gangeya
 * Summary: This file has unit test cases for dataHelperService.
 */
import "jasmine";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { errorCode } from "../../common/constants/error-codes";
import { BadRequestResult, NotFoundResult } from "../../common/objects/custom-errors";
import { TestRelationalModel } from "../../models/specTest/testRelationalModel";
import { DataHelperService } from "./dataHelperService";
import { DataService } from "./dataService";

describe("Test createBooleanSearchConditions() - ", () => {
  it("Prepare search condition using mapping attribute config passed as mappedAttribute parameter", (done) => {
    const mappedAttribute = { map: "isDeleted", to: "meta.isDeleted", type: "boolean" };
    const value = "false";
    const searchObject: any = {};
    const output: any = { "meta.isDeleted": { [Op.eq]: false } };
    DataHelperService.createBooleanSearchConditions(mappedAttribute, value, searchObject);
    expect(searchObject).toEqual(output);
    done();
  });
  it("Check createBooleanSearchConditions() for true value", (done) => {
    const mappedAttribute = { map: "isDeleted", to: "meta.isDeleted", type: "boolean" };
    const value = "True";
    const searchObject: any = {};
    const output: any = { "meta.isDeleted": { [Op.eq]: true } };
    DataHelperService.createBooleanSearchConditions(mappedAttribute, value, searchObject);
    expect(searchObject).toEqual(output);
    done();
  });
  it("Check createBooleanSearchConditions() to check existing searchObject attribute aren't changed", (done) => {
    const mappedAttribute = { map: "isDeleted", to: "meta.isDeleted", type: "boolean" };
    const value = "true";
    const searchObject: any = {test: 123};
    const output: any = {"test": 123, "meta.isDeleted": { [Op.eq]: true }};
    DataHelperService.createBooleanSearchConditions(mappedAttribute, value, searchObject);
    expect(searchObject).toEqual(output);
    done();
  });
  it("Check createBooleanSearchConditions() for null value", (done) => {
    const mappedAttribute = { map: "isDeleted", to: "meta.isDeleted", type: "boolean" };
    const value = null;
    const searchObject: any = {};
    const output: any = {};
    DataHelperService.createBooleanSearchConditions(mappedAttribute, value, searchObject);
    expect(searchObject).toEqual(output);
    done();
  });
  it("Check createBooleanSearchConditions() for undefined value", (done) => {
    const mappedAttribute = { map: "isDeleted", to: "meta.isDeleted", type: "boolean" };
    const value = undefined;
    const searchObject: any = {};
    const output: any = {};
    DataHelperService.createBooleanSearchConditions(mappedAttribute, value, searchObject);
    expect(searchObject).toEqual(output);
    done();
  });
});

describe("Test convertAllToModelsForSave() - ", () => {
  beforeEach(() => {
    const sequelize = new Sequelize({ validateOnly: true });
    sequelize.addModels([TestRelationalModel]);
  });

  it("Check all meta values are populated", (done) => {
    const resource: any = {
      savedRecords: [
        {
          subject: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" },
          resourceType: "Observation",
          effectiveDateTime: "2018-05-08T20:33:58.712Z",
          informationSource: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" }
        }
      ], errorRecords: [] };
    const userId = "dcaabc44-f3e9-4fd2-95d5-bff038c4e028";
    const models = DataHelperService.convertAllToModelsForSave(resource.savedRecords, TestRelationalModel, TestRelationalModel, userId);
    expect(models[0].dataResource).not.toBeNull();
    expect(models[0].id).not.toBeNull();
    expect(models[0].dataResource.meta).not.toBeNull();
    expect(models[0].dataResource.meta.createdBy).toBe(userId);
    expect(models[0].dataResource.meta.versionId).toBe(1);
    expect(models[0].dataResource.clientRequestId).toBeUndefined();
    done();
  });

  it("Check all meta values are populated for a non data Resource model", (done) => {
    const samplePayload = {
      userProfileId: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
      deviceId: "dcaabc44-f3e9-4fd2-95d5",
      resourceType: "TestRelationalModel",
      active: false,
      meta: { clientRequestId: "123" }
    };
    const savedRecords = [samplePayload];
    const userId = "dcaabc44-f3e9-4fd2-95d5-bff038c4e028";
    const models = DataHelperService.convertAllToModelsForSave(savedRecords, TestRelationalModel, null, userId);
    expect(models[0].hasOwnProperty("dataResource")).toBe(false);
    expect(models[0].id).not.toBeNull();
    expect(models[0].userProfileId).toEqual(samplePayload.userProfileId);
    expect(models[0].deviceId).toEqual(samplePayload.deviceId);
    expect(models[0].resourceType).toEqual(samplePayload.resourceType);
    expect(models[0].active).toEqual(samplePayload.active);
    expect(models[0].meta).not.toBeNull();
    expect(models[0].meta.createdBy).toBe(userId);
    expect(models[0].meta.versionId).toBe(1);
    expect(models[0].meta.clientRequestId).toBe(samplePayload.meta.clientRequestId);
    done();
  });

  it("Check client request id is picked from request if it's present", (done) => {
    const resource: any = {
      savedRecords: [
        {
          subject: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" },
          resourceType: "Observation",
          effectiveDateTime: "2018-05-08T20:33:58.712Z",
          meta: { clientRequestId: "123" },
          informationSource: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" }
        }
      ], errorRecords: [] };
    const userId = "dcaabc44-f3e9-4fd2-95d5-bff038c4e028";
    const models = DataHelperService.convertAllToModelsForSave(resource.savedRecords, TestRelationalModel, TestRelationalModel, userId);
    expect(models[0].dataResource.meta.clientRequestId).toBe("123");
    done();
  });

  it("Should have the userId as optional", (done) => {
      const resource: any = {
          savedRecords: [
              {
                  subject: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" },
                  resourceType: "Observation",
                  effectiveDateTime: "2018-05-08T20:33:58.712Z",
                  meta: { clientRequestId: "123" },
                  informationSource: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" }
              }
          ], errorRecords: [] };
      const models = DataHelperService.convertAllToModelsForSave(resource.savedRecords, TestRelationalModel, TestRelationalModel, null);
      expect(models[0].dataResource.meta.clientRequestId).toBe("123");
      expect(models[0].dataResource.meta.lastUpdatedBy).toBe(null);
      expect(models[0].dataResource.meta.createdBy).toBe(null);
      done();
  });

});

describe("Test convertAllToModelsForUpdate() - ", () => {
  beforeEach(() => {
    const sequelize = new Sequelize({ validateOnly: true });
    sequelize.addModels([TestRelationalModel]);
    spyOn(DataService, "fetchDatabaseRow").and.callFake(() => {
      return {
        id: "0fa17a0d-d3d4-4abd-a8e1-7af439b8b3c3",
        code: {
          text: "Number of steps in unspecified time Pedometer",
          coding: [{ code: "55423-8", system: "http://loinc.org", display: "Number of steps in unspecified time Pedometer" }]
        },
        meta: {
          created: "2018-11-29T20:33:58.712Z",
          createdBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
          isDeleted: false,
          versionId: 1,
          lastUpdated: "2018-11-29T20:33:58.712Z",
          lastUpdatedBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
          clientRequestId: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028"
        },
        status: "initial",
        subject: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" },
        category: [
          {
            text: "Vital Signs",
            coding: [{ code: "vital-sign", system: "http://hl7.org/fhir/observation-category", display: "" }]
          }
        ],
        valuePeriod: { end: "2018-10-08T17:48:00.000Z", start: "2018-10-08T17:48:00.000Z" },
        resourceType: "Observation",
        effectiveDateTime: "2018-05-08T20:33:58.712Z",
        informationSource: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" }
      };
    });
  });

  it("Check all meta values are populated", async (done) => {
    const testUserId = "faaabc44-f3e9-4fd2-95d5-bff038c4e028";
    const testClientRequestId = "123";
    const testIsDeleted = false;
    const testStatus = "final";
    const resource: any = {
      savedRecords: [
      {
        id: "0fa17a0d-d3d4-4abd-a8e1-7af439b8b3c3",
        meta: {
          created: "2018-11-29T20:33:58.712Z",
          createdBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
          isDeleted: testIsDeleted,
          versionId: 1,
          lastUpdated: "2018-11-29T20:33:58.712Z",
          lastUpdatedBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
          clientRequestId: testClientRequestId
        },
        status: testStatus,
        subject: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" },
        valuePeriod: { end: "2018-10-08T17:48:00.000Z", start: "2018-10-08T17:48:00.000Z" },
        resourceType: "Observation",
        effectiveDateTime: "2018-05-08T20:33:58.712Z",
        informationSource: { reference: "UserProfile/dcaabc44-f3e9-4fd2-95d5-bff038c4e028" }
      }
    ], errorRecords: [] };

    const models = await DataHelperService.convertAllToModelsForUpdate(resource.savedRecords, TestRelationalModel, TestRelationalModel, testUserId);
    expect(models[0].dataResource).not.toBeNull();
    expect(models[0].id).not.toBeNull();
    expect(models[0].dataResource.meta).not.toBeNull();
    expect(models[0].dataResource.meta.lastUpdatedBy).toBe(testUserId);
    expect(models[0].dataResource.meta.versionId).toBe(2);
    expect(models[0].dataResource.status).toBe(testStatus);
    expect(models[0].dataResource.meta.isDeleted).toBe(false);
    expect(models[0].dataResource.meta.clientRequestId).toBe(testClientRequestId);
    done();
  });

  it("Check version ID mismatch error is thrown when incoming record's version ID doesn't match database's versionID", async (done) => {
    const resource: any = {
      savedRecords: [{
        id: "0fa17a0d-d3d4-4abd-a8e1-7af439b8b3c3",
        meta: {
          created: "2018-11-29T20:33:58.712Z",
          createdBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
          isDeleted: true,
          versionId: 2,
          lastUpdated: "2018-11-29T20:33:58.712Z",
          lastUpdatedBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
          clientRequestId: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028"
        }
      }], errorRecords: [] };
    const userId = "faaabc44-f3e9-4fd2-95d5-bff038c4e028";
    let result;
    try {
      await DataHelperService.convertAllToModelsForUpdate(resource.savedRecords, TestRelationalModel, TestRelationalModel, userId);
    } catch (err) {
      result = err;
    }
    const error = new BadRequestResult(errorCode.VersionIdMismatch, "1");
    expect(result).toEqual(error);
    done();
  });
});

describe("Test convertAllToModelsForUpdate() with no data resource - ", () => {
  const savedRecord = {
    id: "0fa17a0d-d3d4-4abd-a8e1-7af439b8b3c3",
    deviceId: "0fa17a0d-d3d4-4abd-a8e1-7af439b8223",
    userProfileId: "ddd7a0d-aaaa-4abd-a8e1-7af439b8b3c3",
    meta: {
      created: "2018-11-29T20:33:58.712Z",
      createdBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
      isDeleted: false,
      versionId: 1,
      lastUpdated: "2018-11-29T20:33:58.712Z",
      lastUpdatedBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
      clientRequestId: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028"
    },
    active: false,
    resourceType: "TestRelationalModel"
  };
  beforeEach(() => {
    const sequelize = new Sequelize({ validateOnly: true });
    sequelize.addModels([TestRelationalModel]);
    spyOn(DataService, "fetchDatabaseRowStandard").and.callFake(() => {
      return savedRecord;
    });
  });

  it("Check all meta values are populated", async (done) => {
    const recordToBeUpdated = {
      id: "0fa17a0d-d3d4-4abd-a8e1-7af439b8b3c3",
      deviceId: "updated-d3d4-4abd-a8e1-7af439b8223",
      userProfileId: "updated-aaaa-4abd-a8e1-7af439b8b3c3",
      meta: {
        created: "2018-11-29T20:33:58.712Z",
        createdBy: "updated-f3e9-4fd2-95d5-bff038c4e028",
        isDeleted: false,
        versionId: 1,
        lastUpdated: "2018-11-29T20:33:58.712Z",
        lastUpdatedBy: "updated-f3e9-4fd2-95d5-bff038c4e028",
        clientRequestId: "updated-f3e9-4fd2-95d5-bff038c4e028"
      },
      active: false,
      resourceType: "TestRelationalModel"
    };
    const testUserId = "updated-f3e9-4fd2-95d5-bff038c4e028";
    const recordsToBeUpdated = [recordToBeUpdated];

    const models = await DataHelperService.convertAllToModelsForUpdate(recordsToBeUpdated, TestRelationalModel, null, testUserId);
    expect(models[0].hasOwnProperty("dataResource")).toBe(false);
    expect(models[0].id).toBe(recordToBeUpdated.id);
    expect(models[0].deviceId).toBe(recordToBeUpdated.deviceId);
    expect(models[0].userProfileId).toBe(recordToBeUpdated.userProfileId);
    expect(models[0].active).toBe(recordToBeUpdated.active);
    expect(models[0].resourceType).toBe(recordToBeUpdated.resourceType);
    expect(models[0].meta).not.toBeNull();
    expect(models[0].meta.lastUpdatedBy).toBe(testUserId);
    expect(models[0].meta.versionId).toBe(2);
    expect(models[0].meta.isDeleted).toBe(recordToBeUpdated.meta.isDeleted);
    expect(models[0].meta.clientRequestId).toBe(recordToBeUpdated.meta.clientRequestId);
    done();
  });

});

// ALL negetive scenario where incoming record is soft deleted
describe("Test convertAllToModelsForUpdate() - ", () => {
  beforeEach(() => {
    const sequelize = new Sequelize({ validateOnly: true });
    sequelize.addModels([TestRelationalModel]);
    spyOn(DataService, "fetchDatabaseRow").and.callFake(() => {
      return {
        id: "0fa17a0d-d3d4-4abd-a8e1-7af439b8b3c3",
        meta: {
          created: "2018-11-29T20:33:58.712Z",
          createdBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
          isDeleted: true,
          versionId: 1,
          lastUpdated: "2018-11-29T20:33:58.712Z",
          lastUpdatedBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
          clientRequestId: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028"
        }
      };
    });
  });
  it("Check error is thrown from convertAllToModelsForUpdate() if request's record is soft deleted in database", async (done) => {
    const resource: any = {
      savedRecords: [
        {
          id: "0fa17a0d-d3d4-4abd-a8e1-7af439b8b3c3",
          meta: {
            created: "2018-11-29T20:33:58.712Z",
            createdBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
            isDeleted: true,
            versionId: 2,
            lastUpdated: "2018-11-29T20:33:58.712Z",
            lastUpdatedBy: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028",
            clientRequestId: "dcaabc44-f3e9-4fd2-95d5-bff038c4e028"
          }
        }
      ], errorRecords: [] };
    const userId = "faaabc44-f3e9-4fd2-95d5-bff038c4e028";
    let result;
    try {
      await DataHelperService.convertAllToModelsForUpdate(resource.savedRecords, TestRelationalModel, TestRelationalModel, userId);
    } catch (err) {
      result = err;
    }
    const error = new NotFoundResult(errorCode.ResourceNotFound, "Desired record does not exist in the table");
    expect(result).toEqual(error);
    done();
  });
});
