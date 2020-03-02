/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import * as moment from "moment";
import { Op } from "sequelize";
import { IFindOptions } from "sequelize-typescript";
import { Constants } from "../../common/constants/constants";
import * as config from "../../common/objects/config";
import { CareTeam } from "../../models/CPH/policy/careTeam";
import { CareTeamDataResource } from "../../models/CPH/policy/careTeamDataResource";
import { Utility } from "../common/Utility";
import { QueryGenerator } from "../utilities/queryGenerator";
import { DAOService } from "./daoService";

class CareTeamDAO {
  /**
   * The function determines whether the requester has access to perform the specified action by the invoked resource handler.
   * CareTeams will be looked up for the requester with the scope of provided resources.
   * We will then search in the all CareTeams with participant member and site references.
   * @param {string} participantReference
   * @param {string[]} scopedReferences
   */
  public static async findAll(participantReference: string, scopedReferences: string[]): Promise<CareTeamDataResource[]> {
    log.info("Entering CareTeamDAO :: findAll()");
    const currentTimestamp: string = Utility.getTimeStamp();
    // prepare whereClause
    const whereClause = {};
    whereClause[Op.and] = [];
    // prepare queryParams
    const queryParams = {
      status: [Constants.ACTIVE],
      isDeleted: [Constants.IS_DELETED_DEFAULT_VALUE],
      participant: [participantReference],
      site: [scopedReferences.join(Constants.COMMA_VALUE)],
      participantStatus: [Constants.ACTIVE]
    };
    // perform search based on careTeamSearchAttributes and queryParam
    const paramQuery: any = QueryGenerator.getFilterCondition(queryParams, config.settings.careTeamSearchAttributes);
    // create query to search period.end
    const dataResourceQuery = {
      dataResource: {
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
    };
    // add searchQuery and dateResourceQuery to the whereClauseQuery
    whereClause[Op.and].push(paramQuery);
    whereClause[Op.and].push(dataResourceQuery);
    // prepare query for CareTeam
    const careTeamQuery: IFindOptions<CareTeam> = {
      where: whereClause
    };
    let careTeams: any[] = await DAOService.search(CareTeam, careTeamQuery);
    careTeams = _.map(careTeams, Constants.DEFAULT_SEARCH_ATTRIBUTES);
    const filteredCareTeams = [];
    if (careTeams && careTeams.length > 0) {
      log.info("CareTeams found: " + careTeams.length);
      careTeams.forEach((careTeam) => {
        for (const eachParticipant of careTeam.participant) {
          if (eachParticipant.period) {
            // if participant.period.end is undefined or it is greater than currentTimeStamp then only keep the careTeam else discard
            if  (eachParticipant.period.end == undefined || moment(eachParticipant.period.end).isSameOrAfter(moment(currentTimestamp))) {
              filteredCareTeams.push(careTeam);
              break;
            }
          } else {
            filteredCareTeams.push(careTeam);
            break;
          }
        }
      });
      log.info("Filtered CareTeams: " + filteredCareTeams.length);
    }
    log.info("Exiting CareTeamDAO :: findAll()");
    return filteredCareTeams;
  }
}

export { CareTeamDAO };
