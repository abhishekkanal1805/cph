/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import * as moment from "moment";
import { Op } from "sequelize";
import { IFindOptions } from "sequelize-typescript";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ForbiddenResult } from "../../common/objects/custom-errors";
import { Connection } from "../../models/CPH/connection/connection";
import { UserProfile } from "../../models/CPH/userProfile/userProfile";
import { DAOService } from "../dao/daoService";

// FIXME: add documentation to all functions. example: will it search for deleted ones, active ones, exceptions thrown, what attributes are returned etc.
// FIXME: fix the circular dependency with daoService
export class DataFetch {
  /**
   * Retrieves UserProfile information by reading profile ID from authorizer data coming from request.
   * FIXME: rename this getUserAccess. Also define a class for the return
   * @static
   * @param {*} authorizerData
   * @returns {Promise<Map<profileId, profileInfo>>} returns a Map of profileID: profileInfo
   * only if all the provided profiles were found active, un-deleted.
   * the profileInfo contains display name, profileType, profileStatus. Example:
   * {
   *     "1111111": {
   *         "displayName": "Tony Stark",
   *         "profileType": "patient",
   *         "profileStatus": "active",
   *     },
   *     "2222222": {
   *         "displayName": "Steve Rogers",
   *         "profileType": "practitioner",
   *         "profileStatus": "active",
   *     }
   * }
   * @memberof DataFetch
   */
  public static async getUserProfile(profiles: string[]): Promise<any> {
    log.info("Entering DataFetch :: getUserProfile()");
    const userAccessObj = {};
    if (!profiles || profiles.length < 1) {
      log.error("Error in DataFetch: profiles array is empty");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    // Take uniq values and get records and validate count
    // FIXME: can we re-use from other functions
    profiles = _.uniq(profiles);
    const queryObject: IFindOptions<UserProfile> = {
      where: {
        id: profiles,
        status: Constants.ACTIVE,
        meta: {
          isDeleted: false
        }
      }
    };
    const result = await DAOService.search(UserProfile, queryObject);
    if (profiles.length !== result.length) {
      log.error("Error in DataFetch: Record doesn't exists for all requested profile ids");
      throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
    }
    for (const profile of result) {
      if (profile.status !== Constants.ACTIVE) {
        // FIXME: it will never come here
        log.error("Error in DataFetch: UserProfile status is inactive for id : " + profile.id);
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
      // TODO: This logic can be externalized to a function
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
  public static getValidIds(model, recordIds: string[], ownerElement?: string): Promise<any[]> {
    // TODO: "id": recordIds would achieve the same
    // TODO: Use type IFindOption<Model> for query
    const query = {
      where: {
        "id": {
          [Op.or]: recordIds
        },
        "meta.isDeleted": false
      },
      attributes: ["id", "meta", ownerElement].filter(Boolean)
    };
    return DAOService.search(model, query);
  }

  /**
   * Queries the database for the provided profile ids and returns only the ones that are active and not deleted.
   * Only valid ids are returned.
   * @param model
   * @param {string[]} recordIds
   * @return {Promise<any[]>}
   */
  public static getValidUserProfileIds(recordIds: string[]): Promise<any[]> {
    const query: IFindOptions<UserProfile> = {
      where: {
        id: recordIds,
        status: UserProfile.STATUS_ACTIVE,
        meta: {
          isDeleted: false
        }
      },
      attributes: ["id"]
    };
    return DAOService.search(UserProfile, query);
  }

  /**
   * TODO: Review if this is used anywhere, else remove
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
    searchObject[Constants.META_IS_DELETED_KEY] = false;
    if (requestExpirationDate) {
      const expirationMomentObject = moment(requestExpirationDate, Constants.DATE);
      if (!searchObject[Op.or]) {
        searchObject[Op.or] = [];
      }
      // requestExpirationDate will be date so we will check for date, year-month, year and null
      searchObject[Op.or].push(
        {
          [Constants.REQUEST_EXPIRATION_DATE]: {
            [Op.gte]: requestExpirationDate
          }
        },
        {
          [Constants.REQUEST_EXPIRATION_DATE]: {
            [Op.eq]: expirationMomentObject.format(Constants.YEAR_MONTH)
          }
        },
        {
          [Constants.REQUEST_EXPIRATION_DATE]: {
            [Op.eq]: expirationMomentObject.format(Constants.YEAR)
          }
        },
        {
          [Constants.REQUEST_EXPIRATION_DATE]: {
            [Op.eq]: null
          }
        },
        {
          [Constants.STATUS]: {
            [Op.eq]: Constants.ACTIVE
          }
        }
      );
    }
    const query = {
      where: searchObject,
      attributes: [Constants.DEFAULT_SEARCH_ATTRIBUTES]
    };
    const result = await DAOService.search(Connection, query);
    return _.map(result, Constants.DEFAULT_SEARCH_ATTRIBUTES);
  }

  /**
   * FIXME: Add documentation for this. perhaps this method should be re-used in other profile search in this class
   * TODO: Review if this is used anywhere, else remove
   * @static
   * @param {*} searchObject
   * @param {*} model This is optional param, can be either UserProfile or ResearchSubject
   * @returns
   * @memberof DataFetch
   */
  public static async getUserProfiles(searchObject: any, model?: any) {
    // Remove empty data resource object
    searchObject[Constants.DEFAULT_SEARCH_ATTRIBUTES] = {
      [Op.ne]: null
    };
    const query = {
      where: searchObject,
      attributes: [Constants.DEFAULT_SEARCH_ATTRIBUTES]
    };
    model = model ? model : UserProfile;
    const result = await DAOService.search(model, query);
    return _.map(result, Constants.DEFAULT_SEARCH_ATTRIBUTES);
  }
}
