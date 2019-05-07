export class GenericResponse<T> {
  savedRecords: T[];
  errorRecords: T[];

  constructor() {
    this.savedRecords = [];
    this.errorRecords = [];
  }
}
