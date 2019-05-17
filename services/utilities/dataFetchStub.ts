export class DataFetchStub {

  /**
   *
   * @param profiles
   * @returns {{}}
   */
  public static getUserAccess(... profiles: any[]) {
    const userAccess = {};
    for (const profile of profiles) {
      userAccess[profile.id] = {
        profileStatus: profile.status,
        profileType: profile.type,
        displayName: "Lastname-" + + profile.id + ", Firstname-" + profile.id
      };
    }
    return userAccess;
  }

}
