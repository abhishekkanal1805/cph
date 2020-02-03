/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import { ApiContext, ApiEvent } from "../../common/objects/api-interfaces";
import { APIRequestUtility } from "./apiRequestUtility";

export class LogUtility {
  public static getLogEvent(serviceName: string, serviceOperation: string, apiEvent: ApiEvent, apiContext: ApiContext): string {
    log.info("Inside logUtility: getLogEvent()");
    const gatewayRequestId = APIRequestUtility.getGatewayRequestId(apiEvent);
    const lambdaRequestId = APIRequestUtility.getAwsRequestId(apiContext);
    return (
      "method:" +
      serviceOperation +
      ", service:" +
      serviceName +
      ", " +
      "errorLogRef:" +
      [gatewayRequestId, lambdaRequestId].join(".") +
      ", " +
      "userId:" +
      APIRequestUtility.getAuthorizerData(apiEvent).profile
    );
  }

  public static getLogEventInternalInvocation(serviceName: string, serviceOperation: string): string {
    return "method:" + serviceOperation + ", service:" + serviceName;
  }

  /**
   * Returns Request id for each api invoke
   *
   * @static
   * @param {ApiEvent} event AWS event Object
   * @param {ApiContext} context AWS context Object
   * @returns {string}
   * @memberof LogUtility
   */
  public static getRequestLogRef(apiEvent: ApiEvent, apiContext: ApiContext): string {
    const gatewayRequestId = APIRequestUtility.getGatewayRequestId(apiEvent);
    const lambdaRequestId = APIRequestUtility.getAwsRequestId(apiContext);
    return [gatewayRequestId, lambdaRequestId].filter(Boolean).join(".");
  }
}
