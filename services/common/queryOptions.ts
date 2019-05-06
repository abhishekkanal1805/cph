import { Constants } from "../../common/constants/constants";

/**
 * Use this class to construct the QueryOptions when using ORM for performing queries such as findyAll, findOne.
 */
export class QueryOptions {
  // contains the conditions that makes up the search criteria
  where: object;
  // contains a list of column names to fetch with the SQL response
  attributes: string[];
  limit: number;
  offset: number;
  order: string[][];

  constructor(where: object, attributes?: string[], limit?: number, offset?: number, order?: string[][]) {
    this.where = where;
    // if attributes
    this.attributes = (attributes && attributes.length > 0) ? attributes : [Constants.DEFAULT_SEARCH_ATTRIBUTES];
    this.limit = (limit) ? limit : Constants.FETCH_LIMIT;
    if (offset) {
      this.offset = offset;
    }
    this.order = (order) ? order : Constants.DEFAULT_ORDER_BY;
  }
}
