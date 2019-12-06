/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { ErrorResult } from "../../common/objects/custom-errors";

export class GenericResponse<T> {
  savedRecords: T[];
  // QUESTION: can errors be of any other type. do we want the ability to save entire record as errors
  errorRecords: ErrorResult[];

  constructor() {
    this.savedRecords = [];
    this.errorRecords = [];
  }
}
