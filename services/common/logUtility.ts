import * as log from "lambda-log";
import { ApiContext, ApiEvent } from "../../common/objects/api-interfaces";
import { GatewayUtility } from "./gatewayUtility";

export class LogUtility {
  public static getLogEvent(
    serviceName: string,
    serviceOperation: string,
    apiEvent: ApiEvent,
    apiContext: ApiContext
  ): string {
    log.info("Inside logUtility: getLogEvent()");
    const gatewayRequestId = GatewayUtility.getGatewayRequestId(apiEvent);
    const lambdaRequestId = GatewayUtility.getAwsRequestId(apiContext);
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
      GatewayUtility.getCurrentUserId(apiEvent)
    );
  }

  public static getLogEventInternalInvocation(serviceName: string, serviceOperation: string): string {
    return "method:" + serviceOperation + ", service:" + serviceName;
  }
}
