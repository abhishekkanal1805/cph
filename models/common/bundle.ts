/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

/*
 * */
import { Entry } from "./entry";
import { Link } from "./link";

// ------------
class Bundle {
  resourceType: string;
  type: string;
  total: number;
  link: Link[];
  entry: Entry[];
}

export { Bundle };
