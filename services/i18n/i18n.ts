import * as _ from "lodash";
import { Constants } from "../../common/constants/constants";
import { LanguageExtension } from "../../models/common/extension";

export class I18N {

  /**
   * It will find translated value for attribute based on requested language
   * If translation not found then it will return original value of array values
   *
   * @static
   * @param {*} baseValues original value of an attribute
   * @param {*} extendedValues contains translation for an attribute
   * @param {*} translationPredicates predicate used for selecting a particular extension that will be used for providing translated content
   * Example: [{ url: "lang", valueCode: "en_US" }, { url: "lang", valueCode: "en" }]
   * @returns
   * @memberof I18N
   */
  public static getTranslatedValues(baseValues: string[], extendedValues: any[], translationPredicates: LanguageExtension[]): string[] {
    if (!extendedValues) {
      // No translation available so return original value
      return baseValues;
    }
    const translatedValues = [];
    for (const elementIdx in baseValues) {
      let value = baseValues[elementIdx];
      if (!extendedValues[elementIdx]) {
        // If no translation present then assign original value
        translatedValues.push(value);
        continue;
      }
      const extensionValue = _.map(extendedValues[elementIdx].extension, Constants.EXTENSION);
      _.each(extensionValue, (eachExtension) => {
        let idx = -1;
        _.each(translationPredicates, (eachTranslateExtension) => {
          idx = _.findIndex(eachExtension, eachTranslateExtension);
        });
        if (idx > -1) {
          // TODO: need to type translationContent to ContentExtension
          const translationContent: any = _.find(eachExtension, { url: Constants.CONTENT });
          if (translationContent) {
            value = translationContent.valueString;
          }
          return;
        }
      });
      translatedValues.push(value);
    }
    return translatedValues;
  }

  /**
   * It will find translated value for attribute based on requested language
   * If translation not found then it will return original value of that attribute
   *
   * @static
   * @param {*} baseValue value of an attribute when resource is considered to be at base language.
   * @param {*} extendedValue object representing extension of an attribute. It contains all extensions for the attribute
   * including the translations.
   * @param {*} translationPredicates predicate used for selecting a particular extension that will be used for providing translated content
   * Example: [{ url: "lang", valueCode: "en_US" }, { url: "lang", valueCode: "en" }]
   * @returns
   * @memberof I18N
   */
  public static getTranslatedValue(baseValue: string, extendedValue: any, translationPredicates: LanguageExtension[]): string {
    if (!extendedValue) {
      // No translation available so return original value
      return baseValue;
    }
    if (!extendedValue.extension) {
      // No extension present inside translation so return original value
      return baseValue;
    }

    let translatedValue = baseValue;
    const extensionValue = _.map(extendedValue.extension, Constants.EXTENSION);
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
      let idx = -1;
      _.each(translationPredicates, (eachTranslateExtension) => {
        idx = _.findIndex(eachExtension, eachTranslateExtension);
      });
      if (idx > -1) {
        // TODO: need to type translationContent to ContentExtension
        const translationContent: any = _.find(eachExtension, { url: Constants.CONTENT });
        if (translationContent) {
          translatedValue = translationContent.valueString;
        }
        // Got translation value so break
        return;
      }
    });
    return translatedValue;
  }

  /**
   * It will recursively translate resource attributes in to requested language if translation present inside resource
   * Accept-lang: Empty
   *   getByID: return whole resource as it is
   *   search: remove only translation extensions, return base resource without translation
   * Accept-lang: *
   *   getByID: remove exts, return base resource without translation
   *   search: remove only translation extensions, return base resource without translation
   * Accept-lang: en
   *   getByID: remove only translation extensions, return base resource with translations applied
   *   search: remove only translation extensions, return base resource with translations applied
   * @static
   * @param {*} resource Input resource
   * @param {*} translatedResource translated resource
   * @param {string} acceptLanguage input language for translation
   * @memberof I18N
   */
  public static async translateResource(resource: any, translatedResource: any, acceptLanguage: string) {
    const translateExtension: any[] = [{ url: Constants.LANGUAGE, valueCode: acceptLanguage }];
    // If accept-language is en_US, then search for en_US, if not found search for en
    if (acceptLanguage.indexOf(Constants.UNDERSCORE_VALUE) > -1) {
      const baseAcceptLanguage = acceptLanguage.split(Constants.UNDERSCORE_VALUE)[0];
      translateExtension.push({ url: Constants.LANGUAGE, valueCode: baseAcceptLanguage });
    }
    for (const element in resource) {
      // skip translated attribute from new object
      // error TS2339: Property 'startsWith' does not exist on type 'string' so using charAt
      // element.startsWith(Constants.UNDERSCORE_VALUE)
      if (element.charAt(0) === Constants.UNDERSCORE_VALUE) {
        continue;
      }
      const translateElement = Constants.UNDERSCORE_VALUE + element;
      const baseLanguageValue = resource[element];
      if (_.isEmpty(acceptLanguage)) {
        // If acceptLanguage is empty then set baseLanguageValue to translatedResource
        translatedResource[element] = baseLanguageValue;
      }
      const isArrayOfObject = _.every(baseLanguageValue, _.isObject);
      if (!isArrayOfObject) {
        // If value is array of string then assing translationa and return
        // implemented for item[*].additionalText(Questionnaire)
        translatedResource[element] = I18N.getTranslatedValues(baseLanguageValue, resource[translateElement], translateExtension);
        continue;
      }
      const translatedValue = I18N.getTranslatedValue(baseLanguageValue, resource[translateElement], translateExtension);
      if (_.isEmpty(translatedValue)) {
        // if translatedValue is null/{}/[]/"" then no need search recursively
        translatedResource[element] = translatedValue;
        continue;
      }
      if (typeof translatedValue != Constants.OBJECT) {
        // if translatedValue is string/number/boolean then no need search recursively
        translatedResource[element] = translatedValue;
        continue;
      }
      if (!translatedResource[element]) {
        // assign value based on type
        translatedResource[element] = Array.isArray(translatedValue) ? [] : {};
      }
      I18N.translateResource(translatedValue, translatedResource[element], acceptLanguage);
    }
  }
}
