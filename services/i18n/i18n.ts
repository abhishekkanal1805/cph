// import * as log from "lambda-log";
import * as _ from "lodash";
import { Constants } from "../../common/constants/constants";

export class I18N {
  public static getLocale() {
    return I18N.locale;
  }

  public static setLocale(locale: string) {
    I18N.locale = locale;
  }
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

  private static locale: string = "*";
}
