import { ApiContext, ApiEvent } from "../../common/objects/api-interfaces";

/**
 * Utility to help extracting request and context data from ApiEvent and ApiContext
 */
export class APIRequestUtility {
  /**
   * Returns the value of query string if present in ApiEvent or else empty object.
   * If the ApiEvent itself is null or undefined it returns empty object
   * @param {ApiEvent} apiEvent
   * @returns {any}
   */
  public static getQueryStringParameters(apiEvent: ApiEvent): any {
    if (!apiEvent) {
      return {};
    }
    return apiEvent.queryStringParameters || {};
  }

  /**
   * Returns the cognito context data if present in ApiEvent or else null.
   * TODO: write example context strign here
   * @param {ApiEvent} apiEvent
   * @returns {string}
   */
  public static getContextData(apiEvent: ApiEvent): string {
    if (!apiEvent) {
      return "";
    }
    if (apiEvent.requestContext) {
      return apiEvent.requestContext.identity.cognitoAuthenticationProvider || "";
    } else {
      return "";
    }
  }

  /**
   * Returns the cognito authorizer data if present in ApiEvent or else empty object.
   * @param {ApiEvent} apiEvent
   * @returns {object}
   */
  public static getAuthorizerData(apiEvent: ApiEvent) {
    let authorizerObj: any = {};
    // In case of id token apiEvent.requestContext.authorizer.claims contains profile info
    // In case of access token apiEvent.requestContext.authorizer contains profile info
    if (apiEvent && apiEvent.requestContext && apiEvent.requestContext.authorizer) {
      authorizerObj = apiEvent.requestContext.authorizer;
      if (authorizerObj.claims) {
        authorizerObj = Object.assign(authorizerObj, authorizerObj.claims);
      }
    }
    return authorizerObj;
  }

  public static getGatewayRequestId(apiEvent: ApiEvent): string {
    if (!apiEvent) {
      return "";
    }
    if (apiEvent.requestContext) {
      return apiEvent.requestContext.requestId || "";
    } else {
      return "";
    }
  }

  public static getAwsRequestId(apiContext: ApiContext): string {
    if (!apiContext) {
      return "";
    }
    return apiContext.awsRequestId || "";
  }

  /**
   * Concats the requestId and awsRequestId. If either the ApiEvent of ApiContext is not present the respective values
   * are replaced with empty string
   * @param {ApiEvent} apiEvent
   * @param {ApiContext} apiContext
   * @returns {string}
   */
  public static getRequestReference(apiEvent: ApiEvent, apiContext: ApiContext): string {
    const requestId = this.getGatewayRequestId(apiEvent);
    const awsRequestId = this.getAwsRequestId(apiContext);
    return requestId.concat(".", awsRequestId);
  }

  /**
   * Safe way to parse the user id from context data
   * @param {ApiEvent} apiEvent
   * @returns {string}
   */
  public static getCurrentUserId(apiEvent: ApiEvent): string {
    if (!apiEvent) {
      return "";
    }
    const contextDataParts: string[] = this.getContextData(apiEvent).split("CognitoSignIn:");
    if (contextDataParts.length > 1) {
      return contextDataParts[1];
    }
    return "";
  }

  /**
   * Safe way to parse the user pool id from context data
   * @param {ApiEvent} apiEvent
   * @returns {string}
   */
  public static getCurrentUserPoolId(apiEvent: ApiEvent): string {
    if (!apiEvent) {
      return "";
    }
    const contextDataParts: string[] = this.getContextData(apiEvent).split(",");
    if (contextDataParts.length > 0) {
      const contextDataSubParts: string[] = contextDataParts[0].split("/");
      if (contextDataSubParts.length > 1) {
        return contextDataSubParts[1];
      }
    }
    return "";
  }

  public static createApiEvent(body?: string, queryParams?: string, pathParams?: string, context?: string, header?: string): ApiEvent {
    const event: any = {};
    event.body = body;
    event.queryStringParameters = JSON.parse(queryParams);
    event.pathParameters = JSON.parse(pathParams);
    event.requestContext.identity.caller = context; // FIXME: this line would probably fail with trying to access identity on undefined.
    event.headers = JSON.parse(header);
    return event as ApiEvent;
  }

  /**
   * This function is used to convert headers name into lower case
   * @param headers name which needs to be converted into lower case
   * @returns {any}
   */
  public static lowerCaseHeaders(headers: any) {
    const requestHeaders = Object.keys(headers).reduce((result, key) => {
      result[key.toLowerCase()] = headers[key];
      return result;
    }, {});
    return requestHeaders;
  }
}
