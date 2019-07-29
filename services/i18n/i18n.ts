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
   * @param {*} translateExtension requested Extension for translation or conversion
   * @returns
   * @memberof I18N
   */
  public static getTranslatedValue(translateObject: any, originalValue: any, translateExtension: any) {
    let value = originalValue;
    if (!translateObject) {
      // No translation available so return original value
      return value;
    }
    if (!translateObject.extension) {
      // No extension present inside translation so return original value
      return value;
    }
    const extensionValue = _.map(translateObject.extension, Constants.EXTENSION);
    _.each(extensionValue, (eachExtension) => {
      // eachExtension: [
      //   {
      //       "url": "lang",
      //       "valueCode": "de"
      //   },
      //   {
      //       "url": "content",
      //       "valueString": "Wohlbefinden"
      //   }
      // ]
      // translateExtension = [
      //   { url: "lang", valueCode: "en_US" },
      //   { url: "lang", valueCode: "en" }
      // ];
      let idx = -1 ;
      _.each(translateExtension, (eachTranslateExtension) => {
        idx = _.findIndex(eachExtension, eachTranslateExtension);
      });
      if (idx > -1) {
        const translateValue: any = _.find(eachExtension, { url: Constants.CONTENT });
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
    const translateExtension: any[] = [{ url: Constants.LANGUAGE, valueCode: language }];
    // If accept-language is en_US, then search for en_US, if not found search for en
    if (language.indexOf(Constants.UNDERSCORE_VALUE) > -1) {
      const parentLanguage = language.split(Constants.UNDERSCORE_VALUE)[0];
      translateExtension.push({ url: Constants.LANGUAGE, valueCode: parentLanguage });
    }
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
      const translatedValue = this.getTranslatedValue(resource[translateAttribute], originalValue, translateExtension);
      if (typeof translatedValue != Constants.OBJECT) {
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
