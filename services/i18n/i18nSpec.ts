/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { LanguageExtension } from "../../models/common/extension";
import { I18N } from "./i18n";

describe("i18N", () => {
  describe("#getTranslatedValue()", () => {
    it("Should return the base value if extended value was null", () => {
      const baseValue: string = "base value";
      const testExtendedValue: any = null;
      const testTranslationPredicates = [];
      const translatedValue: string = I18N.getTranslatedValue(baseValue, testExtendedValue, testTranslationPredicates);
      expect(translatedValue).toEqual(baseValue);
    });

    it("Should return the base value if extended value was undefined", () => {
      const baseValue: string = "base value";
      const testExtendedValue: any = undefined;
      const testTranslationPredicates = [];
      const translatedValue: string = I18N.getTranslatedValue(baseValue, testExtendedValue, testTranslationPredicates);
      expect(translatedValue).toEqual(baseValue);
    });

    it("Should return base value if there is no match for translation predicate", () => {
      const baseValue: string = "base value";
      const testTranslationLang = "en";
      const testExtendedValue = {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: "de"
              },
              {
                url: "content",
                valueString: "Generalisierte Angststörung"
              }
            ]
          },
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: "de_GE"
              },
              {
                url: "content",
                valueString: "Generalisierte Angststörung - for Germany"
              }
            ]
          }
        ]
      };
      const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationLang }];

      const translatedValue: string = I18N.getTranslatedValue(baseValue, testExtendedValue, testTranslationPredicates);
      expect(translatedValue).toEqual(baseValue);
    });

    it("Should return the language translation if both lang/region are present and if language was requested", () => {
      const baseValue: string = "base value";
      const expectedLanguageTranslatedContent = "Generalisierte Angststörung";
      const testTranslationLang = "de";
      const testExtendedValue = {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLang
              },
              {
                url: "content",
                valueString: expectedLanguageTranslatedContent
              }
            ]
          },
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: "de_GE"
              },
              {
                url: "content",
                valueString: "Generalisierte Angststörung - for Germany"
              }
            ]
          }
        ]
      };
      const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationLang }];

      const translatedValue: string = I18N.getTranslatedValue(baseValue, testExtendedValue, testTranslationPredicates);
      expect(translatedValue).toEqual(expectedLanguageTranslatedContent);
    });

    // FIXME: make this pass
    it("Should return the region translation if both lang/region are present and if either was requested - predicate region first", () => {
      const baseValue: string = "base value";
      const expectedLocaleTranslatedContent = "Generalisierte Angststörung - for Germany";
      const testTranslationLang = "de";
      const testTranslationLocale = "de_GE";
      const testExtendedValue = {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLang
              },
              {
                url: "content",
                valueString: "Generalisierte Angststörung"
              }
            ]
          },
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLocale
              },
              {
                url: "content",
                valueString: expectedLocaleTranslatedContent
              }
            ]
          }
        ]
      };
      const testTranslationPredicates: LanguageExtension[] = [
        { url: "lang", valueCode: testTranslationLocale },
        { url: "lang", valueCode: testTranslationLang }
      ];

      const translatedValue: string = I18N.getTranslatedValue(baseValue, testExtendedValue, testTranslationPredicates);
      expect(translatedValue).toEqual(expectedLocaleTranslatedContent);
    });

    it("Should return the language translation if the requested locale specific translation was not found", () => {
      const baseValue: string = "base value";
      const expectedLanguageTranslatedContent = "Generalisierte Angststörung";
      const testTranslationLang = "de";
      const testTranslationLocale = "de_GE";
      const testExtendedValue = {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLang
              },
              {
                url: "content",
                valueString: expectedLanguageTranslatedContent
              }
            ]
          },
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: "de_UK"
              },
              {
                url: "content",
                valueString: "Generalisierte Angststörung - for UK"
              }
            ]
          }
        ]
      };
      const testTranslationPredicates: LanguageExtension[] = [
        { url: "lang", valueCode: testTranslationLocale },
        { url: "lang", valueCode: testTranslationLang }
      ];

      const translatedValue: string = I18N.getTranslatedValue(baseValue, testExtendedValue, testTranslationPredicates);
      expect(translatedValue).toEqual(expectedLanguageTranslatedContent);
    });

    // FIXME: make this pass
    it("Should return the first language translation if multiples are provided with same language", () => {
      const baseValue: string = "base value";
      const expectedLanguageTranslatedContent = "Generalisierte Angststörung";
      const testTranslationLang = "de";
      const testExtendedValue = {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLang
              },
              {
                url: "content",
                valueString: expectedLanguageTranslatedContent
              }
            ]
          },
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLang
              },
              {
                url: "content",
                valueString: "second translation of same lang"
              }
            ]
          }
        ]
      };
      const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationLang }];

      const translatedValue: string = I18N.getTranslatedValue(baseValue, testExtendedValue, testTranslationPredicates);
      expect(translatedValue).toEqual(expectedLanguageTranslatedContent);
    });

    // FIXME: make this pass
    it("Should return the first region translation if multiples are provided with same region", () => {
      const baseValue: string = "base value";
      const expectedRegionTranslatedContent = "Generalisierte Angststörung";
      const testTranslationRegion = "de_GE";
      const testExtendedValue = {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationRegion
              },
              {
                url: "content",
                valueString: expectedRegionTranslatedContent
              }
            ]
          },
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationRegion
              },
              {
                url: "content",
                valueString: "second translation of same region"
              }
            ]
          }
        ]
      };
      const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationRegion }];

      const translatedValue: string = I18N.getTranslatedValue(baseValue, testExtendedValue, testTranslationPredicates);
      expect(translatedValue).toEqual(expectedRegionTranslatedContent);
    });
  });

  describe("#getTranslatedValues()", () => {
    it("Should return the base values if extended values was null", () => {
      const baseValues: string[] = ["base value"];
      const testExtendedValues: any[] = null;
      const testTranslationPredicates = [];
      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      expect(translatedValues).toEqual(baseValues);
    });

    it("Should return the base values if extended values was undefined", () => {
      const baseValues: string[] = ["base value"];
      const testExtendedValues: any[] = undefined;
      const testTranslationPredicates = [];
      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      expect(translatedValues).toEqual(baseValues);
    });

    it("Should return the base values if extended values was empty", () => {
      const baseValues: string[] = ["base value"];
      const testExtendedValues: any[] = [];
      const testTranslationPredicates = [];
      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      expect(translatedValues).toEqual(baseValues);
    });

    it("Should return base value if there is no match for translation predicate", () => {
      const baseValues: string[] = ["base value"];
      const testTranslationLang = "en";
      const testExtendedValues = [
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "de"
                },
                {
                  url: "content",
                  valueString: "Generalisierte Angststörung"
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "de_GE"
                },
                {
                  url: "content",
                  valueString: "Generalisierte Angststörung - for Germany"
                }
              ]
            }
          ]
        }
      ];
      const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationLang }];

      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      expect(translatedValues).toEqual(baseValues);
    });

    it("Should return the language translation if both lang/region are present and if language was requested", () => {
      const baseValues: string[] = ["base value"];
      const expectedLanguageTranslatedContent = ["Generalisierte Angststörung"];
      const localeTranslatedContent = "Generalisierte Angststörung - for Germany";
      const testTranslationLang = "de";
      const testTranslationLocale = "de_GE";
      const testExtendedValues = [
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: expectedLanguageTranslatedContent[0]
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLocale
                },
                {
                  url: "content",
                  valueString: localeTranslatedContent
                }
              ]
            }
          ]
        }
      ];
      const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationLang }];

      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      expect(translatedValues).toEqual(expectedLanguageTranslatedContent);
    });

    // FIXME: make this pass
    it("Should return the region translation if both lang/region are present and if either was requested - predicate region first", () => {
      const baseValues: string[] = ["base value"];
      const expectedLocaleTranslatedContent = ["Generalisierte Angststörung - for Germany"];
      const testTranslationLang = "de";
      const testTranslationLocale = "de_GE";
      const testExtendedValues = [
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: "Generalisierte Angststörung"
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLocale
                },
                {
                  url: "content",
                  valueString: expectedLocaleTranslatedContent[0]
                }
              ]
            }
          ]
        }
      ];
      const testTranslationPredicates: LanguageExtension[] = [
        { url: "lang", valueCode: testTranslationLocale },
        { url: "lang", valueCode: testTranslationLang }
      ];

      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      // FIXME: make this test pass
      expect(translatedValues).toEqual(expectedLocaleTranslatedContent);
    });

    it("Should return the language translation if the requested locale specific translation was not found", () => {
      const baseValues: string[] = ["base value"];
      const expectedLanguageTranslatedContent = ["Generalisierte Angststörung"];
      const testTranslationLang = "de";
      const testTranslationLocale = "de_GE";
      const testExtendedValues = [
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: expectedLanguageTranslatedContent[0]
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang + "_UK"
                },
                {
                  url: "content",
                  valueString: "Generalisierte Angststörung - for UK"
                }
              ]
            }
          ]
        }
      ];
      const testTranslationPredicates: LanguageExtension[] = [
        { url: "lang", valueCode: testTranslationLocale },
        { url: "lang", valueCode: testTranslationLang }
      ];

      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      expect(translatedValues).toEqual(expectedLanguageTranslatedContent);
    });

    // FIXME: make this pass
    it("Should return the first language translation if multiples are provided with same language", () => {
      const baseValues: string[] = ["base value"];
      const expectedLanguageTranslatedContents = ["Generalisierte Angststörung"];
      const testTranslationLang = "de";
      const testExtendedValues = [
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: expectedLanguageTranslatedContents[0]
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: "second translation of same lang"
                }
              ]
            }
          ]
        }
      ];
      const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationLang }];

      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      expect(translatedValues).toEqual(expectedLanguageTranslatedContents);
    });

    // FIXME: make this pass
    it("Should return the first region translation if multiples are provided with same region", () => {
      const baseValues: string[] = ["base value"];
      const expectedRegionTranslatedContents = ["Generalisierte Angststörung"];
      const testTranslationRegion = "de_GE";
      const testExtendedValues = [
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationRegion
                },
                {
                  url: "content",
                  valueString: expectedRegionTranslatedContents[0]
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationRegion
                },
                {
                  url: "content",
                  valueString: "second translation of same region"
                }
              ]
            }
          ]
        }
      ];
      const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationRegion }];

      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      expect(translatedValues).toEqual(expectedRegionTranslatedContents);
    });

    // FIXME: make this pass. #3 and #4 in translatedValues is coming out wrong.
    it("Should be able to translate multiple values as per the provided predicate", () => {
      const baseValues: string[] = ["base value 1", "base value 2", "base value 3", "base value 4", "base value 5"];
      const expectedLanguageTranslatedContent = ["translated value - 1", "translated value - 2", "translated value - 3", "translated value - 4", baseValues[4]];
      const testTranslationLang = "de";
      const testTranslationLocale = "de_GE";
      const testExtendedValues = [
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: expectedLanguageTranslatedContent[0]
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "de_UK"
                },
                {
                  url: "content",
                  valueString: "Generalisierte Angststörung - for UK"
                }
              ]
            }
          ]
        },
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: expectedLanguageTranslatedContent[1]
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "de_FR"
                },
                {
                  url: "content",
                  valueString: "translated in french"
                }
              ]
            }
          ]
        },
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: "translation in generic german should be less preferred"
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLocale
                },
                {
                  url: "content",
                  valueString: expectedLanguageTranslatedContent[2]
                }
              ]
            }
          ]
        },
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "es"
                },
                {
                  url: "content",
                  valueString: "translation in spanish"
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLocale
                },
                {
                  url: "content",
                  valueString: expectedLanguageTranslatedContent[3]
                }
              ]
            }
          ]
        },
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "es"
                },
                {
                  url: "content",
                  valueString: "translation in spanish"
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "fr"
                },
                {
                  url: "content",
                  valueString: "translation in french"
                }
              ]
            }
          ]
        }
      ];
      const testTranslationPredicates: LanguageExtension[] = [
        { url: "lang", valueCode: testTranslationLocale },
        { url: "lang", valueCode: testTranslationLang }
      ];

      const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
      expect(translatedValues).toEqual(expectedLanguageTranslatedContent);
    });
  });

  describe("#translateResource()", () => {
    it("a record that has no translations/extensions should have no translations", () => {
      const testTranslationLang: string = "de";
      const element1Value: string = "General Anxiety Disorder";
      const element2Value: string[] = ["base value 1", "base value 2", "base value 3", "base value 4", "base value 5"];
      const testRecord = {
        element1: element1Value,
        element2: element2Value
      };

      const translatedRecord = I18N.translateResource(testRecord, testTranslationLang);
      expect(translatedRecord.element1).toEqual(element1Value);
      expect(translatedRecord.element2).toEqual(element2Value);
    });

    // FIXME: all extensions should be retained
    it("an element that has no matching extensions should not be translated and all extensions should be retained", () => {
      const testTranslationLang: string = "de";
      const element1Value: string = "General Anxiety Disorder";
      const anyExtendedValue = {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLang
              },
              {
                url: "content",
                valueString: "Generalisierte Angststörung"
              }
            ]
          },
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: "es"
              },
              {
                url: "content",
                valueString: "Trastorno de ansiedad generalizada"
              }
            ]
          }
        ]
      };
      const testRecord = {
        element1: element1Value,
        _element2: anyExtendedValue
      };
      const translatedRecord = I18N.translateResource(testRecord, testTranslationLang);
      expect(translatedRecord.element1).toEqual(element1Value);
      expect(translatedRecord["_element2"]).toEqual(anyExtendedValue);
    });

    // FIXME: Get this to work
    it("a record that has translations/extensions should be translated as expected and all extensions should be retained", () => {
      const testTranslationLang: string = "de";
      const expectedElement1Translation: string = "Generalisierte Angststörung";
      const testElement1ExtendedValue = {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLang
              },
              {
                url: "content",
                valueString: expectedElement1Translation
              }
            ]
          },
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: "es"
              },
              {
                url: "content",
                valueString: "Trastorno de ansiedad generalizada"
              }
            ]
          }
        ]
      };

      const testBaseValues: string[] = ["base value 1", "base value 2", "base value 3", "base value 4", "base value 5"];
      const expectedElement2Translations = ["translated value - 1", "translated value - 2", "translated value - 3", "translated value - 4", testBaseValues[4]];
      const testElement2ExtendedValues = [
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: expectedElement2Translations[0]
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "de_UK"
                },
                {
                  url: "content",
                  valueString: "Generalisierte Angststörung - for UK"
                }
              ]
            }
          ]
        },
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: expectedElement2Translations[1]
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "de_FR"
                },
                {
                  url: "content",
                  valueString: "translated in french"
                }
              ]
            }
          ]
        },
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "zh"
                },
                {
                  url: "content",
                  valueString: "translated in mandarin"
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: expectedElement2Translations[2]
                }
              ]
            }
          ]
        },
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "es"
                },
                {
                  url: "content",
                  valueString: "translation in spanish"
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: testTranslationLang
                },
                {
                  url: "content",
                  valueString: expectedElement2Translations[3]
                }
              ]
            }
          ]
        },
        {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "es"
                },
                {
                  url: "content",
                  valueString: "translation in spanish"
                }
              ]
            },
            {
              url: "http://hl7.org/fhir/StructureDefinition/translation",
              extension: [
                {
                  url: "lang",
                  valueCode: "fr"
                },
                {
                  url: "content",
                  valueString: "translation in french"
                }
              ]
            }
          ]
        }
      ];
      const testRecord = {
        element1: "Generalized Anxiety Disorder",
        _element1: testElement1ExtendedValue,
        element2: ["base value 1", "base value 2", "base value 3", "base value 4", "base value 5"],
        _element2: testElement2ExtendedValues
      };
      const translatedRecord = I18N.translateResource(testRecord, testTranslationLang);
      expect(translatedRecord.element1).toEqual(expectedElement1Translation);
      expect(translatedRecord.element2).toEqual(expectedElement2Translations);
      expect(translatedRecord["_element1"]).toEqual(testElement1ExtendedValue);
      expect(translatedRecord["_element2"]).toEqual(testElement2ExtendedValues);
    });
  });

  it("Should return the region translation if both lang/region are present and if either was requested - predicate lang first", () => {
    const baseValue: string = "base value";
    const expectedLocaleTranslatedContent = "Generalisierte Angststörung";
    const testTranslationLang = "de";
    const testTranslationLocale = "de_GE";
    const testExtendedValue = {
      extension: [
        {
          url: "http://hl7.org/fhir/StructureDefinition/translation",
          extension: [
            {
              url: "lang",
              valueCode: testTranslationLang
            },
            {
              url: "content",
              valueString: "Generalisierte Angststörung"
            }
          ]
        },
        {
          url: "http://hl7.org/fhir/StructureDefinition/translation",
          extension: [
            {
              url: "lang",
              valueCode: testTranslationLocale
            },
            {
              url: "content",
              valueString: expectedLocaleTranslatedContent
            }
          ]
        }
      ]
    };
    const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationLang }, { url: "lang", valueCode: testTranslationLocale }];

    const translatedValue: string = I18N.getTranslatedValue(baseValue, testExtendedValue, testTranslationPredicates);
    expect(translatedValue).toEqual(expectedLocaleTranslatedContent);
  });

  it("Should return the region translation if both lang/region are present and if either was requested - predicate lang first", () => {
    const baseValues: string[] = ["base value"];
    const expectedLocaleTranslatedContent = ["Generalisierte Angststörung"];
    const testTranslationLang = "de";
    const testTranslationLocale = "de_GE";
    const testExtendedValues = [
      {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLang
              },
              {
                url: "content",
                valueString: "Generalisierte Angststörung"
              }
            ]
          },
          {
            url: "http://hl7.org/fhir/StructureDefinition/translation",
            extension: [
              {
                url: "lang",
                valueCode: testTranslationLocale
              },
              {
                url: "content",
                valueString: expectedLocaleTranslatedContent[0]
              }
            ]
          }
        ]
      }
    ];
    const testTranslationPredicates: LanguageExtension[] = [{ url: "lang", valueCode: testTranslationLang }, { url: "lang", valueCode: testTranslationLocale }];

    const translatedValues: string[] = I18N.getTranslatedValues(baseValues, testExtendedValues, testTranslationPredicates);
    expect(translatedValues).toEqual(expectedLocaleTranslatedContent);
  });
});
