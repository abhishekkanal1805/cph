/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import {Op} from "sequelize";
import {IFindOptions} from "sequelize-typescript";
import {Constants} from "../../common/constants/constants";
import {CareTeam} from "../../models/CPH/policy/careTeam";
import {CareTeamDataResource} from "../../models/CPH/policy/careTeamDataResource";
import {Utility} from "../common/Utility";
import {ReferenceUtility} from "../utilities/referenceUtility";
import {DAOService} from "./daoService";

class CareTeamDAO {

    public static async findAll(participantReference: string, references: string[]): Promise<CareTeamDataResource[]> {
        log.info("CareTeamDAO - getting CareTeam for references=", references);
        const studyReferences: string[] = ReferenceUtility.getUniqueReferences(references, Constants.STUDY_REFERENCE);
        const siteReferences: string[] = ReferenceUtility.getUniqueReferences(references, Constants.STUDY_SITE_REFERENCE);
        const currentTimestamp: string = Utility.getTimeStamp();

        const careTeamQuery: IFindOptions<CareTeam> = {
            where: {
                status: "active",
                dataResource: {
                    [Op.and]: [
                        {
                            // participant[*].reference is in participantReference
                        },
                        {
                            [Op.or]: [
                                {
                                    [Op.contains]: {
                                        study: studyReferences
                                    }
                                },
                                {
                                    [Op.contains]: {
                                        site: siteReferences
                                    }
                                }
                            ]
                        },
                        {
                            [Op.and]: [
                                {
                                    period: {
                                        // TODO: what is start date is not provided?
                                        start: {
                                            [Op.gte]: currentTimestamp
                                        }
                                    }
                                },
                                {
                                    period: {
                                        // TODO: what is end date is not provided?
                                        end: {
                                            [Op.lte]: currentTimestamp
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                meta: {
                    isDeleted: false
                }
            }
        };
        log.info("CareTeamDAO - query=", careTeamQuery);

        const careTeams = await DAOService.search(CareTeam, careTeamQuery);
        return _.map(careTeams, Constants.DEFAULT_SEARCH_ATTRIBUTES);
    }
}

export { CareTeamDAO };
