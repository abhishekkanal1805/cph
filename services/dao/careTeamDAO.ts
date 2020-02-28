/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { IFindOptions } from "sequelize-typescript";
import { Constants } from "../../common/constants/constants";
import { CareTeam } from "../../models/CPH/policy/careTeam";
import { CareTeamDataResource } from "../../models/CPH/policy/careTeamDataResource";
import { Utility } from "../common/Utility";
import { QueryGenerator } from "../utilities/queryGenerator";
import { ReferenceUtility } from "../utilities/referenceUtility";
import { DAOService } from "./daoService";

class CareTeamDAO {
  public static async findAll(participantReference: string, references: string[]): Promise<CareTeamDataResource[]> {
    log.info("Entering CareTeamDAO :: findAll()");
    // filter studyReferences
    const studyReferences: string[] = ReferenceUtility.getUniqueReferences(references, Constants.STUDY_REFERENCE);
    // filter siteReferences
    const siteReferences: string[] = ReferenceUtility.getUniqueReferences(references, Constants.STUDY_SITE_REFERENCE);
    const currentTimestamp: string = Utility.getTimeStamp();
    const column = {
      columnValueType: Constants.TYPE_ARRAY,
      columnHierarchy: Constants.CARE_TEAM_PARTICIPANT_PATH,
      operation: Constants.PREFIX_EQUAL
    };
    const participantCondition = {};
    // call createGenericSearchConditions to create query for participantReference as participant is array in CareTeam
    await QueryGenerator.createGenericSearchConditions(column, participantReference, participantCondition);
    // prepare whereClause
    const whereClause = {};
    whereClause[Op.and] = [{ status: { [Op.eq]: Constants.ACTIVE } }, { meta: { isDeleted: { [Op.eq]: false } } }, participantCondition];
    // create query to search study, site references and  period.end
    const dataResourceQuery = {
      dataResource: {
        [Op.and]: [
          {
            [Op.or]: [
              {
                study: {
                  reference: {
                    [Op.in]: studyReferences
                  }
                }
              },
              {
                site: {
                  reference: {
                    [Op.in]: siteReferences
                  }
                }
              }
            ]
          },
          {
            [Op.or]: [
              {
                period: {
                  // check if end date is blank
                  end: {
                    [Op.eq]: null
                  }
                }
              },
              {
                period: {
                  // check endDate is less than currentTimeStamp
                  end: {
                    [Op.gte]: currentTimestamp
                  }
                }
              }
            ]
          }
        ]
      }
    };
    // add searchQuery to the whereClauseQuery
    whereClause[Op.and].push(dataResourceQuery);
    // prepare query for CareTeam
    const careTeamQuery: IFindOptions<CareTeam> = {
      where: whereClause
    };
    const careTeams = await DAOService.search(CareTeam, careTeamQuery);
    log.info("Exiting CareTeamDAO :: findAll()");
    return _.map(careTeams, Constants.DEFAULT_SEARCH_ATTRIBUTES);
  }
}

export { CareTeamDAO };
