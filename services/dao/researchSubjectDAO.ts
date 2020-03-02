/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { IFindOptions } from "sequelize-typescript";
import { Constants } from "../../common/constants/constants";
import { ResearchSubject } from "../../models/CPH/researchSubject/researchSubject";
import { ResearchSubjectDataResource } from "../../models/CPH/researchSubject/researchSubjectDataResource";
import { ReferenceUtility } from "../utilities/referenceUtility";
import { DAOService } from "./daoService";

class ResearchSubjectDAO {
  /**
   * It selects unique ResearchSubject references from the provided list and retrieves non deleted resources from database
   * @param references
   */
  public static async getByReferences(references: string[]): Promise<ResearchSubjectDataResource[]> {
    // filtering out duplicates and empty values
    log.info("ResearchSubjectDAO - References requested: ", references);
    const uniqueSubjectReferences = ReferenceUtility.getUniqueReferences(references, Constants.RESEARCHSUBJECT_REFERENCE);
    if (uniqueSubjectReferences.length < 1) {
      log.info("ResearchSubjectDAO - no valid ResearchSubject references found, returning null");
      return null;
    }
    log.info("ResearchSubjectDAO - unique and subject References: ", uniqueSubjectReferences);

    const researchSubjectQuery: IFindOptions<ResearchSubject> = {
      where: {
        id: ReferenceUtility.convertToResourceIds(uniqueSubjectReferences, Constants.RESEARCHSUBJECT_REFERENCE),
        meta: {
          isDeleted: false
        }
      },
      attributes: [Constants.DEFAULT_SEARCH_ATTRIBUTES]
    };
    log.info("ResearchSubjectDAO - query=", researchSubjectQuery);

    const researchSubjects = await DAOService.search(ResearchSubject, researchSubjectQuery);
    return _.map(researchSubjects, Constants.DEFAULT_SEARCH_ATTRIBUTES);
  }
}

export { ResearchSubjectDAO };
