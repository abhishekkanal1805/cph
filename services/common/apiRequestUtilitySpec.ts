/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import "jasmine";
import { APIRequestUtility } from "./apiRequestUtility";

describe("APIRequestUtility", () => {
  describe("lowerCaseHeaders", () => {
    it("Convert headers to lower case to make them case insensitive - lower case header name should be present", async (done) => {
      const headers = {
        "Content-type": "application/json",
        "Authorization": "abcd1234"
      };
      const resultHeaders = APIRequestUtility.convertHeadersToLowerCase(headers);

      // verify lower case headers
      expect(Object.keys(resultHeaders)).toContain("content-type");
      expect(Object.keys(resultHeaders)).toContain("authorization");
      done();
    });

    it("Convert headers to lower case to make them case insensitive - values should match after converting header case", async (done) => {
      const headers = {
        "Content-type": "application/json",
        "Authorization": "abcd1234"
      };
      const resultHeaders = APIRequestUtility.convertHeadersToLowerCase(headers);

      // verify lower case headers
      expect(resultHeaders["content-type"]).toBe("application/json");
      expect(resultHeaders["authorization"]).toEqual("abcd1234");
      done();
    });
  });
});
