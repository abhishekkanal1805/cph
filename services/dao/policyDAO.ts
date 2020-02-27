/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { IFindOptions } from "sequelize-typescript";
import { Constants } from "../../common/constants/constants";
import { Policy } from "../../models/CPH/policy/policy";
import { PolicyDataResource } from "../../models/CPH/policy/policyDataResource";
import { DAOService } from "./daoService";

class PolicyDAO {
  /**
   * Returns all policies that match the provided search parameters
   * @param policyReferences all references will be converted to ids for searching in the table
   * @param actions Array of resource actions keywords. The policy select must have these actions for the record to be selected.
   * All provided actions will be ANDed in the select query such.
   * Example1: if actions=["Observation:create"]
   * where clause=(("Policy"."dataResource" @> '{"action":["Observation:create"]}' OR "Policy"."dataResource" @> '{"action":["Observation:*"]}'))
   * Example2: if actions=["Task:create", "Visit:create"]
   * where clause=(("Policy"."dataResource" @> '{"action":["Task:create"]}' OR "Policy"."dataResource" @> '{"action":["Task:*"]}')
   * AND ("Policy"."dataResource" @> '{"action":["Visit:create"]}' OR "Policy"."dataResource" @> '{"action":["Visit:*"]}'))
   */
  public static async findAll(policyReferences: string[], actions: string[]): Promise<PolicyDataResource[]> {
    log.info("PolicyDAO - looking for actions=" + JSON.stringify(actions) + " in policies=" + JSON.stringify(policyReferences));

    if (!policyReferences || policyReferences.length < 1) {
      log.info("PolicyDAO - no policy references provided.");
      return [];
    }

    // converting references to ids
    const policyIds: string[] = policyReferences.map((policyReference) => policyReference.split("Policy/")[1]);
    const policyQuery: IFindOptions<Policy> = {
      where: {
        id: policyIds,
        effect: Constants.POLICY_EFFECT_ALLOW,
        status: Constants.POLICY_STATUS_ACTIVE,
        dataResource: {
          [Op.and]: []
        },
        meta: {
          isDeleted: false
        }
      }
    };

    const dataResourceQuery = policyQuery.where["dataResource"][Op.and];
    for (const action of actions) {
      // getting the service name for deriving the specific wild card action
      const resourceType: string = action.split(":")[0];
      const actionQuery = {
        [Op.or]: [
          {
            [Op.contains]: {
              action: [action]
            }
          },
          {
            [Op.contains]: {
              action: [resourceType + ":*"]
            }
          }
        ]
      };
      dataResourceQuery.push(actionQuery);
    }
    log.info("PolicyDAO - query=", policyQuery);

    const policies = await DAOService.search(Policy, policyQuery);
    return _.map(policies, Constants.DEFAULT_SEARCH_ATTRIBUTES);
  }
}

export { PolicyDAO };
