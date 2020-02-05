/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { IFindOptions } from "sequelize-typescript";
import { Constants } from "../../common/constants/constants";
import { ResearchSubject } from "../../models/CPH/researchSubject/researchSubject";
import { ResearchSubjectDataResource } from "../../models/CPH/researchSubject/researchSubjectDataResource";
import { DAOService } from "./daoService";

class ResearchSubjectDAO {
  /**
   * Gets the ResearchSubject by references from database
   * @param references
   */
  public static async getByReferences(references: string[]): Promise<ResearchSubjectDataResource[]> {
    // filtering out duplicates and empty values
    log.info("ResearchSubjectDAO - References requested: " + JSON.stringify(references));
    const uniqueAndValidReferences = [...new Set(references)].filter(Boolean);
    const researchSubjectIds: string[] = uniqueAndValidReferences.map((researchSubjectReference) => {
      if (!researchSubjectReference.startsWith(Constants.RESEARCHSUBJECT_REFERENCE)) {
        log.info("ResearchSubjectDAO - reference provided is not for a ResearchSubject. entry=" + researchSubjectReference);
        return null;
      }
      return researchSubjectReference.split(Constants.RESEARCHSUBJECT_REFERENCE)[1];
    });

    if (researchSubjectIds.length < 1) {
      log.info("ResearchSubjectDAO - no valid ResearchSubject references found, returning null");
      return null;
    }

    const researchSubjectQuery: IFindOptions<ResearchSubject> = {
      where: {
        id: researchSubjectIds
      },
      attributes: [Constants.DEFAULT_SEARCH_ATTRIBUTES]
    };
    log.info("ResearchSubjectDAO - query=" + JSON.stringify(researchSubjectQuery));

    const researchSubjects = await DAOService.search(ResearchSubject, researchSubjectQuery);
    return _.map(researchSubjects, Constants.DEFAULT_SEARCH_ATTRIBUTES);
  }
}

export { ResearchSubjectDAO };
