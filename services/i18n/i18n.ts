import * as _ from "lodash";
export class I18N {
  /**
   * If Accept-Language present then it will filter out the results based on the language
   *
   * @param {*} resource Record present in data base
   * @param {string} language language specified in Header
   * @memberof I18N
   */
  public static async filterResource(resource: any, language: string) {
    const translate = resource.translation || {};
    // If translation attribute not present then return original object
    if (_.isEmpty(translate)) {
      return resource;
    }
    // If No translation present for requested attribute, return base language
    Object.assign(resource, translate[language] || {});
    delete resource.translation;
    return resource;
  }
}
