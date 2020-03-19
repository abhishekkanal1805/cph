/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { Constants } from "../../common/constants/constants";
import { PolicyDataResource } from "../../models/CPH/policy/policyDataResource";
import { CareTeamDAO } from "../dao/careTeamDAO";
import { PolicyAssignmentDAO } from "../dao/policyAssignmentDAO";
import { PolicyDAO } from "../dao/policyDAO";
import { ResearchSubjectDAO } from "../dao/researchSubjectDAO";
import { UserProfileRepositoryStub } from "../dao/userProfileRepositoryStub";
import { PolicyManager } from "./policyManager";
import { ResourceAccessResponse } from "./resourceAccessResponse";
import { SubjectAccessRequest } from "./subjectAccessRequest";

describe("policyManager", () => {
  describe("#requestSubjectScopedAccess()", () => {
    it("PolicyManager - subject references was not found. policy based access cannot be determined.", async (done) => {
      spyOn(ResearchSubjectDAO, "getByReferences").and.callFake(() => {
        // return blank array indicating that research subjects passed were not found
        return [];
      });
      const ownerOriginalSubjectReference: string = "ResearchSubject/111";
      const accessRequest: SubjectAccessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        subjectReferences: [ownerOriginalSubjectReference],
        resourceActions: ["Task:create"]
      };
      const grantedPolicies: Map<string, PolicyDataResource[]> = await PolicyManager.requestSubjectScopedAccess(accessRequest);
      expect(grantedPolicies.size).toBeLessThan(1);
      done();
    });
    it("PolicyManager - policy assignments or care teams not found for any of the researchSubjects. policy based access cannot be determined.", async (done) => {
      spyOn(ResearchSubjectDAO, "getByReferences").and.callFake(() => {
        // return research subjects
        return [
          {
            id: "1",
            study: {
              reference: "ResearchStudy/1"
            },
            site: {
              reference: "StudySite/1"
            }
          },
          {
            id: "2",
            study: {
              reference: "ResearchStudy/2"
            },
            site: {
              reference: "StudySite/2"
            }
          }
        ];
      });
      spyOn(PolicyManager, "requestResourceScopedAccess").and.returnValues(
        {
          grantedPolicies: [],
          grantedResources: [],
          requestToken: "1"
        },
        {
          grantedPolicies: [],
          grantedResources: [],
          requestToken: "2"
        }
      );
      const ownerOriginalSubjectReferences: string[] = ["ResearchSubject/1", "ResearchSubject/2"];
      const accessRequest: SubjectAccessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        subjectReferences: ownerOriginalSubjectReferences,
        resourceActions: ["Task:create"]
      };
      const policyGrants: Map<string, PolicyDataResource[]> = await PolicyManager.requestSubjectScopedAccess(accessRequest);
      expect(policyGrants.size).toBeLessThan(1);
      done();
    });

    it("PolicyManager - policy assignments or care teams found for one researchSubject. policy based access determined.", async (done) => {
      spyOn(ResearchSubjectDAO, "getByReferences").and.callFake(() => {
        // return research subjects
        return [
          {
            id: "1",
            study: {
              reference: "ResearchStudy/1"
            },
            site: {
              reference: "StudySite/1"
            }
          },
          {
            id: "2",
            study: {
              reference: "ResearchStudy/2"
            },
            site: {
              reference: "StudySite/2"
            }
          }
        ];
      });
      spyOn(PolicyManager, "requestResourceScopedAccess").and.returnValues(
        {
          grantedPolicies: [
            {
              id: "1"
            }
          ],
          grantedResources: ["ResearchStudy/1"],
          requestToken: "1"
        },
        {
          grantedPolicies: [],
          grantedResources: [],
          requestToken: "2"
        }
      );
      const ownerOriginalSubjectReferences: string[] = ["ResearchSubject/1", "ResearchSubject/2"];
      const accessRequest: SubjectAccessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        subjectReferences: ownerOriginalSubjectReferences,
        resourceActions: ["Task:create"]
      };
      const policyGrants: Map<string, PolicyDataResource[]> = await PolicyManager.requestSubjectScopedAccess(accessRequest);
      expect(policyGrants.size).toBe(1);
      expect(policyGrants.has("ResearchSubject/1")).toEqual(true);
      done();
    });

    it("PolicyManager - policy assignments and care teams found for all the researchSubjects. policy based access determined.", async (done) => {
      spyOn(ResearchSubjectDAO, "getByReferences").and.callFake(() => {
        // return research subjects
        return [
          {
            id: "1",
            study: {
              reference: "ResearchStudy/1"
            },
            site: {
              reference: "StudySite/1"
            }
          },
          {
            id: "2",
            study: {
              reference: "ResearchStudy/2"
            },
            site: {
              reference: "StudySite/2"
            }
          }
        ];
      });
      spyOn(PolicyManager, "requestResourceScopedAccess").and.returnValues(
        {
          grantedPolicies: [
            {
              id: "1"
            }
          ],
          grantedResources: ["ResearchStudy/1"],
          requestToken: "1"
        },
        {
          grantedPolicies: [
            {
              id: "2"
            }
          ],
          grantedResources: ["StudySite/2"],
          requestToken: "2"
        }
      );
      const ownerOriginalSubjectReferences: string[] = ["ResearchSubject/1", "ResearchSubject/2"];
      const accessRequest: SubjectAccessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        subjectReferences: ownerOriginalSubjectReferences,
        resourceActions: ["Task:create"]
      };
      const policyGrants: Map<string, PolicyDataResource[]> = await PolicyManager.requestSubjectScopedAccess(accessRequest);
      expect(policyGrants.size).toBe(2);
      done();
    });
  });

  describe("#requestResourceScopedAccess()", () => {
    it("PolicyManager - scopedResources not available. policy based access cannot be determined.", async (done) => {
      const accessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        scopedResources: [],
        resourceActions: ["Task:create"],
        requestToken: "111"
      };
      const resourceAccessResponse: ResourceAccessResponse = await PolicyManager.requestResourceScopedAccess(accessRequest);
      expect(resourceAccessResponse.grantedPolicies.length).toBeLessThan(1);
      done();
    });

    it("PolicyManager - resourceAction not available. policy based access cannot be determined.", async (done) => {
      spyOn(PolicyAssignmentDAO, "findAll").and.callFake(() => {
        // return blank array of policy assignments
        return [];
      });
      const accessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        scopedResources: ["StudySite/1", "ResearchStudy/1"],
        resourceActions: [],
        requestToken: "111"
      };
      const resourceAccessResponse: ResourceAccessResponse = await PolicyManager.requestResourceScopedAccess(accessRequest);
      expect(resourceAccessResponse.grantedPolicies.length).toBeLessThan(1);
      done();
    });

    it("PolicyManager - policy assignments not found. policy based access cannot be determined.", async (done) => {
      spyOn(PolicyAssignmentDAO, "findAll").and.callFake(() => {
        // return blank array of policy assignments
        return [];
      });
      spyOn(PolicyDAO, "findAll").and.callFake(() => {
        // return blank array of policies
        return [];
      });
      const accessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        scopedResources: ["StudySite/1", "ResearchStudy/1"],
        resourceActions: ["Task:create"],
        requestToken: "111"
      };
      const resourceAccessResponse: ResourceAccessResponse = await PolicyManager.requestResourceScopedAccess(accessRequest);
      expect(resourceAccessResponse.grantedPolicies.length).toBeLessThan(1);
      done();
    });

    it("PolicyManager - policies not found. policy based access cannot be determined.", async (done) => {
      spyOn(PolicyAssignmentDAO, "findAll").and.callFake(() => {
        // return array of policy assignments
        return [
          {
            policy: {
              reference: "Policy/b34a4b9b-288d-4cdb-b295-07760fc8c808"
            },
            resourceScope: {
              resource: {
                reference: "ResearchStudy/1"
              }
            }
          }
        ];
      });
      spyOn(PolicyDAO, "findAll").and.callFake(() => {
        // return blank array of policies
        return [];
      });
      const accessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        scopedResources: ["StudySite/1", "ResearchStudy/1"],
        resourceActions: ["Task:create"],
        requestToken: "111"
      };
      const resourceAccessResponse: ResourceAccessResponse = await PolicyManager.requestResourceScopedAccess(accessRequest);
      expect(resourceAccessResponse.grantedPolicies.length).toBeLessThan(1);
      done();
    });

    it("PolicyManager - care teams not found. policy based access cannot be determined.", async (done) => {
      spyOn(PolicyAssignmentDAO, "findAll").and.callFake(() => {
        // return array of policy assignments
        return [
          {
            policy: {
              reference: "Policy/1"
            },
            resourceScope: {
              resource: {
                reference: "ResearchStudy/1"
              }
            }
          }
        ];
      });
      spyOn(PolicyDAO, "findAll").and.callFake(() => {
        // return array of policies
        return [{ id: "1" }];
      });

      spyOn(CareTeamDAO, "findAll").and.callFake(() => {
        // return blank array of care teams
        return [];
      });
      const accessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        scopedResources: ["StudySite/1", "ResearchStudy/1"],
        resourceActions: ["Task:create"],
        requestToken: "111"
      };
      const resourceAccessResponse: ResourceAccessResponse = await PolicyManager.requestResourceScopedAccess(accessRequest);
      expect(resourceAccessResponse.grantedPolicies.length).toBeLessThan(1);
      done();
    });

    it("PolicyManager - care team found for site level not study. policy based access cannot be determined.", async (done) => {
      spyOn(PolicyAssignmentDAO, "findAll").and.callFake(() => {
        // return array of policy assignments
        return [
          {
            policy: {
              reference: "Policy/1"
            },
            resourceScope: {
              resource: {
                reference: "ResearchStudy/1"
              }
            }
          },
          {
            policy: {
              reference: "Policy/2"
            },
            resourceScope: {
              resource: {
                reference: "StudySite/1"
              }
            }
          }
        ];
      });
      spyOn(PolicyDAO, "findAll").and.callFake(() => {
        // return array of policies
        return [{ id: "1" }, { id: "2" }];
      });

      spyOn(CareTeamDAO, "findAll").and.callFake(() => {
        // return array of care teams
        return [
          {
            site: {
              reference: "StudySite/1"
            }
          }
        ];
      });
      const accessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        scopedResources: ["StudySite/1", "ResearchStudy/1"],
        resourceActions: ["Task:create"],
        requestToken: "111"
      };
      const resourceAccessResponse: ResourceAccessResponse = await PolicyManager.requestResourceScopedAccess(accessRequest);
      expect(resourceAccessResponse.grantedPolicies.length).toEqual(1);
      expect(resourceAccessResponse.grantedResources).toContain("StudySite/1");
      done();
    });

    it("PolicyManager - care team found for site and study both. policy based access determined.", async (done) => {
      spyOn(PolicyAssignmentDAO, "findAll").and.callFake(() => {
        // return array of policy assignments
        return [
          {
            policy: {
              reference: "Policy/1"
            },
            resourceScope: {
              resource: {
                reference: "ResearchStudy/1"
              }
            }
          },
          {
            policy: {
              reference: "Policy/2"
            },
            resourceScope: {
              resource: {
                reference: "StudySite/1"
              }
            }
          }
        ];
      });
      spyOn(PolicyDAO, "findAll").and.callFake(() => {
        // return array of policies
        return [{ id: "1" }, { id: "2" }];
      });

      spyOn(CareTeamDAO, "findAll").and.callFake(() => {
        // return array of care teams
        return [
          {
            site: {
              reference: "StudySite/1"
            }
          },
          {
            study: {
              reference: "ResearchStudy/1"
            },
            site: {
              reference: "StudySite/2"
            }
          }
        ];
      });
      const accessRequest = {
        requesterReference: Constants.USERPROFILE_REFERENCE + UserProfileRepositoryStub.ACTIVE_PATIENT_USER_PROFILES[0].id,
        scopedResources: ["StudySite/1", "ResearchStudy/1"],
        resourceActions: ["Task:create"],
        requestToken: "111"
      };
      const resourceAccessResponse: ResourceAccessResponse = await PolicyManager.requestResourceScopedAccess(accessRequest);
      expect(resourceAccessResponse.grantedPolicies.length).toEqual(2);
      done();
    });
  });
});
