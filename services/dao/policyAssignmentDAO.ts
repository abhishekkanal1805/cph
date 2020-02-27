/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { IFindOptions } from "sequelize-typescript";
import { Constants } from "../../common/constants/constants";
import { PolicyAssignment } from "../../models/CPH/policy/policyAssignment";
import { PolicyAssignmentDataResource } from "../../models/CPH/policy/policyAssignmentDataResource";
import { DAOService } from "./daoService";

class PolicyAssignmentDAO {
  public static async findAll(userReference: string, resources: string[]): Promise<PolicyAssignmentDataResource[]> {
    log.info("PolicyAssignmentDAO - getting assignments for user=" + userReference + " scoped in resource=", resources);

    if (!resources || resources.length < 1) {
      log.info("PolicyAssignmentDAO - no resource references provided.");
      return [];
    }

    const policyAssignmentQuery: IFindOptions<PolicyAssignment> = {
      where: {
        principal: userReference,
        resourceScope: resources,
        meta: {
          isDeleted: false
        }
      }
    };
    log.info("PolicyAssignmentDAO - query=", policyAssignmentQuery);

    const assignments = await DAOService.search(PolicyAssignment, policyAssignmentQuery);
    return _.map(assignments, Constants.DEFAULT_SEARCH_ATTRIBUTES);
  }
}

export { PolicyAssignmentDAO };
