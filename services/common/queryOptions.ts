
export class QueryOptions {
  // contains the conditions that makes up the search criteria
  where: object;
  // contains a list of column names to fetch with the SQL response
  attributes: string[];

  constructor(where: object, attributes: string[]) {
    this.where = where;
    this.attributes = attributes;
  }
}
