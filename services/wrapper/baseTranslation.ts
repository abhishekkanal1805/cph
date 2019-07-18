import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { I18N } from "../i18n/i18n";

export class BaseTranslation {
  /**
   * It will translate all resource as per accept language.
   * GetById: if accept-language is not present then return dataResource without any translation
   * Search: if accept-language is not present then return dataResource with translation with base language
   * @static
   * @param {any[]} resources Records for response
   * @param {string} language language present in accept language header
   * @returns
   * @memberof BaseTranslation
   */
  public static async translateResources(resources: any, language: string) {
    log.info("Entering BaseTranslation :: baseTranslation()");
    const startDate: any = new Date();
    const translatedRecords = [];
    const allPromise = [];
    let isResourceArray: boolean = true;
    const translationLanguage = language;
    // we always return array for search and object for getById operation
    if (!Array.isArray(resources)) {
      // if resource is not array then convert it into array and response convert it back
      resources = [resources];
      isResourceArray = false;
    }
    resources.forEach((eachResource: any) => {
      // If accept language is empty then return base language record and remove translation
      if (language === Constants.DEFALULT_ACCEPT_LANGUAGE && isResourceArray) {
        language = eachResource.language;
      }
      // set content language header for reponse builder
      I18N.setContentLanguage(eachResource.language);
      const translatedRecord = {};
      const resultPromise = I18N.translateResource(eachResource, translatedRecord, language);
      translatedRecords.push(translatedRecord);
      allPromise.push(resultPromise);
    });
    await Promise.all(allPromise);
    // If translation present then add it to content response
    // If accept-language is * and base language preset, then return base language
    if ((translationLanguage != Constants.DEFALULT_ACCEPT_LANGUAGE) && I18N.isResourceTranslated()) {
      I18N.setContentLanguage(translationLanguage);
    }
    const endDate: any = new Date();
    log.info(`Translated ${translatedRecords.length} resource to language=${language} in ${(endDate - startDate) / 1000}sec.`);
    log.info("Exiting BaseTranslation :: baseTranslation()");
    return isResourceArray ? translatedRecords : translatedRecords[0];
  }
}
