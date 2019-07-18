import * as _ from "lodash";
import { Constants } from "../../common/constants/constants";

export class I18N {
  public static getContentLanguage() {
    return [...new Set(this.contentLanguages)].filter(Boolean).join(Constants.COMMA_SPACE_VALUE);
  }

  public static setContentLanguage(language) {
    this.contentLanguages.push(language);
  }

  public static isResourceTranslated() {
    return this.isTranslated;
  }

  public static resetContentLanguage() {
    this.contentLanguages = [];
  }

  /**
   * It will find translated value for attribute based on requested language
   * If translation not found then it will return original value of that attribute
   *
   * @static
   * @param {*} translateObject contains translation for an attribute
   * @param {*} originalValue original value of an attribute
   * @param {string} language requested language
   * @returns
   * @memberof I18N
   */
  public static getTranslatedValue(translateObject: any, originalValue: any, language: string) {
    let value = originalValue;
    if (!translateObject) {
      // No translation available so return original value
      return value;
    }
    if (!translateObject.extension) {
      // No extension present inside translation so return original value
      return value;
    }
    const extensionValue = _.map(translateObject.extension, "extension");
    _.each(extensionValue, (eachExtension) => {
      const idx = _.findIndex(eachExtension, { url: "lang", valueCode: language });
      if (idx > -1) {
        const translateValue: any = _.find(eachExtension, { url: "content" });
        if (translateValue) {
          this.isTranslated = true;
          value = translateValue.valueString;
        }
        // Got translation value so break
        return;
      }
    });
    return value;
  }

  /**
   * It will recursively translate resource attributes in to requested language if translation present inside resource
   *
   * @static
   * @param {*} resource Input resource
   * @param {*} translatedResource translated resource
   * @param {string} language input language for translation
   * @memberof I18N
   */
  public static async translateResource(resource: any, translatedResource: any, language: string) {
    if (Constants.DEFALULT_ACCEPT_LANGUAGE === language) {
      // No need to translate, return existing resource
      Object.assign(translatedResource, resource);
      return;
    }
    for (const attribute in resource) {
      // skip translated attribute from new object
      // error TS2339: Property 'startsWith' does not exist on type 'string' so using charAt
      // attribute.startsWith(Constants.UNDERSCORE_VALUE)
      if (attribute.charAt(0) === Constants.UNDERSCORE_VALUE) {
        continue;
      }
      const translateAttribute = Constants.UNDERSCORE_VALUE + attribute;
      const originalValue = resource[attribute];
      const translatedValue = resource[translateAttribute] ? this.getTranslatedValue(resource[translateAttribute], originalValue, language) : originalValue;
      if (typeof translatedValue != "object") {
        // if value is not an object then no need search recursively
        translatedResource[attribute] = translatedValue;
        continue;
      }
      if (!translatedResource[attribute]) {
        // assign value based on type
        translatedResource[attribute] = Array.isArray(translatedValue) ? [] : {};
      }
      this.translateResource(translatedValue, translatedResource[attribute], language);
    }
  }

  private static contentLanguages: string[] = [];
  private static isTranslated: boolean = false;
}
