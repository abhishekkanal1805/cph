/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { CareTeamDAO } from "./careTeamDAO";
import { DAOService } from "./daoService";

describe("CareTeamDAO", () => {
  describe("#findAll()", () => {
    it("No care teams found", async (done) => {
      spyOn(DAOService, "search").and.callFake(() => {
        // return blank array indicating that care teams were not found for given data
        return [];
      });
      const careTeams = await CareTeamDAO.findAll("UserProfile/1", ["StudySite/1", "ResearchStudy/1"]);
      expect(careTeams.length).toBeLessThan(1);
      done();
    });
    it("Filter CareTeams - participant status is not active", async (done) => {
      spyOn(DAOService, "search").and.callFake(() => {
        // return array of care teams
        return [
          {
            dataResource: {
              study: {
                reference: "ResearchStudy/1"
              },
              site: {
                reference: "StudySite/1"
              },
              participant: [
                {
                  status: "inactive",
                  member: {
                    reference: "UserProfile/1"
                  }
                }
              ]
            }
          }
        ];
      });
      const careTeams = await CareTeamDAO.findAll("UserProfile/1", ["ResearchStudy/1"]);
      expect(careTeams.length).toBeLessThan(1);
      done();
    });
    it("Filter CareTeams - participant status is active, period expired", async (done) => {
      spyOn(DAOService, "search").and.callFake(() => {
        // return array of care teams
        return [
          {
            dataResource: {
              study: {
                reference: "ResearchStudy/1"
              },
              site: {
                reference: "StudySite/1"
              },
              participant: [
                {
                  status: "active",
                  member: {
                    reference: "UserProfile/1"
                  },
                  period: {
                    end: "2020-02-01T12:00:00.000Z"
                  }
                }
              ]
            }
          }
        ];
      });
      const careTeams = await CareTeamDAO.findAll("UserProfile/1", ["ResearchStudy/1"]);
      expect(careTeams.length).toBeLessThan(1);
      done();
    });
    it("Filter CareTeams - participant status is active and period not expired", async (done) => {
      spyOn(DAOService, "search").and.callFake(() => {
        // return array of care teams
        return [
          {
            dataResource: {
              study: {
                reference: "ResearchStudy/1"
              },
              site: {
                reference: "StudySite/1"
              },
              participant: [
                {
                  status: "active",
                  member: {
                    reference: "UserProfile/1"
                  },
                  period: {
                    end: "2030-03-15T12:00:00.000Z"
                  }
                }
              ]
            }
          }
        ];
      });
      const careTeams = await CareTeamDAO.findAll("UserProfile/1", ["ResearchStudy/1"]);
      expect(careTeams.length).toBe(1);
      done();
    });
    it("Filter CareTeams - Multiple care teams found. Participant status is active and period not expired for one careTeam", async (done) => {
      spyOn(DAOService, "search").and.callFake(() => {
        // return array of care teams
        return [
          {
            dataResource: {
              study: {
                reference: "ResearchStudy/1"
              },
              site: {
                reference: "StudySite/1"
              },
              participant: [
                {
                  status: "active",
                  member: {
                    reference: "UserProfile/1"
                  },
                  period: {
                    end: "2030-03-15T12:00:00.000Z"
                  }
                }
              ]
            }
          },
          {
            dataResource: {
              study: {
                reference: "ResearchStudy/1"
              },
              site: {
                reference: "StudySite/1"
              },
              participant: [
                {
                  status: "inactive",
                  member: {
                    reference: "UserProfile/1"
                  },
                  period: {
                    end: "2030-03-15T12:00:00.000Z"
                  }
                }
              ]
            }
          }
        ];
      });
      const careTeams = await CareTeamDAO.findAll("UserProfile/1", ["ResearchStudy/1"]);
      expect(careTeams.length).toBe(1);
      done();
    });
  });
});
