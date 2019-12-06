/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { APIGatewayEvent, Context, ProxyCallback, ProxyResult } from "aws-lambda";
export type ApiCallback = ProxyCallback;
export type ApiContext = Context;
export type ApiEvent = APIGatewayEvent;
export type ApiResponse = ProxyResult;
export type ApiHandler = (event: ApiEvent, context: ApiContext, callback: ApiCallback) => void;
