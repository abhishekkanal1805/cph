/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";

/**
 * a generic hierarchy visitor that can iterate thru the array and gather values for the specified field name.
 * It will descend into nested collections if the descendantName is specified.
 */
export class FieldVisitor {
  static INTERNAL_ERROR = "INTERNAL_ERROR";
  fieldName: string;
  descendantName: string;
  fieldValues: string[];
  duplicatedFieldValues: string[];
  error: string;

  /**
   * create an instance of new visitor that can be used to visit arrays and gather all field names.  and even look into descendants
   * @param {string} fieldName
   * @param {string} descendantName
   */
  constructor(fieldName: string, descendantName: string) {
    this.fieldValues = [];
    this.duplicatedFieldValues = [];
    this.error = null;
    this.fieldName = fieldName;
    this.descendantName = descendantName;
    log.info("constructed with fieldName=" + this.fieldName);
    log.info("constructed with descendantName=" + this.descendantName);
  }

  public gatherAllFieldNameAndVisitDescendants(objectAtCurrentIndex: object, index: number, arr: object[]) {
    // this inside here is passed/define by th invoker of this callback which is the foreach of array in visitAll
    log.info("this=" + JSON.stringify(this));
    log.info("visit with fieldName=" + this.fieldName);
    log.info("visit with descendantName=" + this.descendantName);
    if (!this.fieldName) {
      log.error("Incorrectly configured field visitor");
      return;
    }
    const currentFieldValue = objectAtCurrentIndex[this.fieldName];
    log.info(currentFieldValue);
    if (this.fieldValues.indexOf(currentFieldValue) >= 0) {
      this.duplicatedFieldValues.push(currentFieldValue);
    }
    this.fieldValues.push(currentFieldValue);
    if (this.descendantName && objectAtCurrentIndex.hasOwnProperty(this.descendantName)) {
      log.info("Found descendants...iterating those now.");
      this.visitAll(objectAtCurrentIndex[this.descendantName]);
    }
  }

  public visitAll(arr: object[]) {
    try {
      if (arr && arr.length > 0) {
        arr.forEach(this.gatherAllFieldNameAndVisitDescendants, this);
      } else {
        log.info("No array provided or it was empty.");
      }
    } catch (err) {
      this.error = FieldVisitor.INTERNAL_ERROR + ". Error determining uniqueness of item ids for the user profile. Error" + err.toString();
      log.error(this.error + err);
    }
  }

  public getAllDuplicates(): string[] {
    log.info("fieldValues=" + JSON.stringify(this.fieldValues));
    log.info("duplicatedFieldValues=" + JSON.stringify(this.duplicatedFieldValues));
    return this.duplicatedFieldValues;
  }

  public getAllDuplicatesAsString(): string {
    if (this.duplicatedFieldValues.length > 0) {
      return this.getAllDuplicates().join(", ");
    }
    return null;
  }
}
