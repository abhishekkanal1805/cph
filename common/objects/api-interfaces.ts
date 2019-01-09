import { APIGatewayEvent, Context, ProxyCallback, ProxyResult } from "aws-lambda";
import { ErrorResult } from "./errors";
export type ApiCallback = ProxyCallback;
export type ApiContext = Context;
export type ApiEvent = APIGatewayEvent;
export type ApiResponse = ProxyResult;
export type ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback) => void;

export interface ErrorResponseBody {
  error: ErrorResult;
}
