/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import {IFindOptions} from "sequelize-typescript";
import {PolicyAssignment} from "../../models/CPH/policy/policyAssignment";
import {DAOService} from "./daoService";

class PolicyAssignmentDAO {

    public static async findAll(userReference: string, resources: string[]): Promise<PolicyAssignment[]> {
        log.info ("PolicyAssignmentDAO - getting assignments for user=" + userReference + " scoped in resource=" + JSON.stringify(resources));

        if (!resources || resources.length < 1) {
            log.info ("PolicyAssignmentDAO - no resource references provided.");
            return null;
        }

        const policyAssignmentQuery: IFindOptions<PolicyAssignment> = {
            where: {
                assignee: userReference,
                resource: resources
            }
        };
        log.info ("PolicyAssignmentDAO - query=" + JSON.stringify(policyAssignmentQuery));

        return DAOService.search(PolicyAssignment, policyAssignmentQuery);
        // no need to use _.map as all fields are flattened. if we add dataResource then we may need to change this
    }
}

export { PolicyAssignmentDAO };
