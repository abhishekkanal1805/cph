/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

export class DataFetchStub {
  /**
   * The function creates a map of profileID and userAccess object.
   * User access object is constructed by copying the attributes id, status, type from the provided profile.
   * None of the attributes are mandatory but at least ID is expected so the returned data is meaningful.
   * @param profiles
   * @returns {{}}
   */
  public static getUserAccess(...profiles: any[]) {
    const userAccess = {};
    for (const profile of profiles) {
      userAccess[profile.id] = {
        profileStatus: profile.status,
        profileType: profile.type,
        displayName: "Lastname-" + profile.id + ", Firstname-" + profile.id
      };
    }
    return userAccess;
  }
}
