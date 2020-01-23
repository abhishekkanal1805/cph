/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import {Op} from "sequelize";
import {IFindOptions} from "sequelize-typescript";
import {Constants} from "../../common/constants/constants";
import {Policy} from "../../models/CPH/policy/policy";
import {PolicyDataResource} from "../../models/CPH/policy/policyDataResource";
import {DAOService} from "./daoService";

class PolicyDAO {

    /**
     */
    public static async findAll(policyReferences: string[], action: string): Promise<PolicyDataResource[]> {
        log.info ("PolicyDAO - looking for action=" + action + " in policies=" + JSON.stringify(policyReferences));

        if (!policyReferences || policyReferences.length < 1) {
            log.info ("PolicyDAO - no policy references provided.");
            return null;
        }
        // getting the service name for deriving a wild card action
        const serviceName: string = action.split(":")[0];

        // converting references to ids
        const policyIds: string[] = policyReferences.map((policyReference) => (policyReference.split("Policy/")[1]));
        const policyQuery: IFindOptions<Policy> = {
            where: {
                id: policyIds,
                effect: Constants.POLICY_EFFECT_ALLOW,
                status: Constants.POLICY_STATUS_ACTIVE,
                dataResource: {
                    [Op.or]: [
                        {
                            [Op.contains]: {
                                action: [action]
                            }
                        },
                        {
                            [Op.contains]: {
                                action: [serviceName + ":*"]
                            }
                        }
                    ]
                }
            }
        };
        log.info ("PolicyDAO - query=" + JSON.stringify(policyQuery));

        const policies = await DAOService.search(Policy, policyQuery);
        return _.map(policies, Constants.DEFAULT_SEARCH_ATTRIBUTES);
    }
}

export {PolicyDAO};
