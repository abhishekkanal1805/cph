import * as log from "lambda-log";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
import { DAOService } from "../dao/daoService";

export class DataFetch {
  /**
   * Retrieves UserProfile information by reading profile ID from authorizer data coming from request.
   *
   * @static
   * @param {*} authorizerData
   * @returns {Promise<any>}
   * @memberof DataFetch
   */
  public static async getUserProfile(profile: string): Promise<any> {
    log.info("Entering DataFetch :: getUserProfile()");
    const userAccessObj = {
      profileId: profile,
      profileStatus: "",
      profileType: "",
      displayName: ""
    };
    if (!profile) {
      log.error("Error in DataFetch: ProfileId is missing in authorizer");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    const result = await DAOService.fetchRowByPk(profile, UserProfile);
    if (result.status !== Constants.ACTIVE) {
      log.error("Error in DataFetch: UserProfile status is inactive");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // if user is valid then set display attribute and profile status
    const givenName = result.name ? result.name.given || [] : [];
    const familyName = result.name ? result.name.family || "" : "";
    userAccessObj.profileStatus = result.status;
    userAccessObj.profileType = result.type;
    userAccessObj.displayName = [familyName, givenName.join(Constants.SPACE_VALUE)].join(Constants.COMMA_SPACE_VALUE);
    return userAccessObj;
  }

  /**
   *
   *
   * @static
   * @param {*} model
   * @param {string[]} recordIds
   * @returns {Promise<any>}
   * @memberof DataFetch
   */
  public static async getValidIds(model, recordIds: string[]): Promise<any[]> {
    const query = {
      where: {
        "id": {
          [Op.or]: recordIds
        },
        "meta.isDeleted": false
      },
      attributes: ["id", "meta"]
    };
    const result = await DAOService.search(model, query);
    return result;
  }
}
