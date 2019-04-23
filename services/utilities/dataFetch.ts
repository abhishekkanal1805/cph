import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
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
  public static async getUserProfile(profiles: string[]): Promise<any> {
    log.info("Entering DataFetch :: getUserProfile()");
    const userAccessObj = {};
    if (profiles.length < 1) {
      log.error("Error in DataFetch: profiles array is empty");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // Take uniq values and get records and validate count
    profiles = _.uniq(profiles);
    const queryObject = {
      where: {
        id: profiles,
        status: Constants.ACTIVE
      }
    };
    const result = await DAOService.search(UserProfile, queryObject);
    if (profiles.length != result.length) {
      log.error("Error in DataFetch: Record doesn't exists for all requested profile ids");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    for (const profile of result) {
      if (profile.status !== Constants.ACTIVE) {
        log.error("Error in DataFetch: UserProfile status is inactive for id : " + profile.id);
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
      // if user is valid then set display attribute and profile status
      const givenName = profile.name ? profile.name.given || [] : [];
      const familyName = profile.name ? profile.name.family || Constants.EMPTY_VALUE : Constants.EMPTY_VALUE;
      const profileId = profile.id;
      if (!userAccessObj[profileId]) {
        userAccessObj[profileId] = {};
      }
      userAccessObj[profileId].profileStatus = profile.status;
      userAccessObj[profileId].profileType = profile.type;
      userAccessObj[profileId].displayName = [familyName, givenName.join(Constants.SPACE_VALUE)].join(Constants.COMMA_SPACE_VALUE);
    }
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

  /**
   *
   *
   * @static
   * @param {*} model
   * @param {string[]} recordIds
   * @returns {Promise<any>}
   * @memberof DataFetch
   */
  public static async getReferenceResouce(model, recordIds: string): Promise<any[]> {
    const query = {
      where: {
        "id": {
          [Op.or]: recordIds
        },
        "meta.isDeleted": false
      },
      attributes: ["dataResource"]
    };
    const result = await DAOService.search(model, query);
    return result;
  }
  /**
   * @param model
   * @param {string[]} recordIds
   * @return {Promise<any[]>}
   */
  public static async getValidUserProfileIds(recordIds: string[]): Promise<any[]> {
    const query = {
      where: {
        "id": {
          [Op.or]: recordIds
        },
        "meta.isDeleted": false,
        "status": Constants.ACTIVE
      },
      attributes: ["id"]
    };
    const result = await DAOService.search(UserProfile, query);
    return result;
  }

  /**
   *
   *
   * @static
   * @param {*} searchObject
   * @param {string} [requestExpirationDate]
   * @returns
   * @memberof DataFetch
   */
  public static async getConnections(searchObject: any, requestExpirationDate?: string) {
    // Remove empty data resource object
    searchObject[Constants.DEFAULT_SEARCH_ATTRIBUTES] = {
      [Op.ne]: null
    };
    if (requestExpirationDate) {
      searchObject[Constants.REQUEST_EXPIRATION_DATE] = {
        [Op.gte]: requestExpirationDate,
        [Op.ne]: null
      };
    }
    const query = {
      where: searchObject,
      attributes: [Constants.DEFAULT_SEARCH_ATTRIBUTES]
    };
    const result = await DAOService.search(Connection, query);
    return _.map(result, Constants.DEFAULT_SEARCH_ATTRIBUTES);
  }

  /**
   *
   *
   * @static
   * @param {*} searchObject
   * @returns
   * @memberof DataFetch
   */
  public static async getUserProfiles(searchObject: any) {
    // Remove empty data resource object
    searchObject[Constants.DEFAULT_SEARCH_ATTRIBUTES] = {
      [Op.ne]: null
    };
    const query = {
      where: searchObject,
      attributes: [Constants.DEFAULT_SEARCH_ATTRIBUTES]
    };
    const result = await DAOService.search(UserProfile, query);
    return _.map(result, Constants.DEFAULT_SEARCH_ATTRIBUTES);
  }
}
