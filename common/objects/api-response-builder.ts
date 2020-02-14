/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as HttpStatusCode from "http-status-codes";
import { Constants } from "../constants/constants";
import { ApiCallback, ApiResponse } from "./api-interfaces";
import * as config from "./config";
import {
  BadRequestResult,
  ErrorResult,
  ForbiddenResult,
  InsufficientAccountPermissions,
  InternalServerErrorResult,
  MultiStatusResult,
  NotFoundResult,
  UnAuthorizedResult,
  UnprocessableEntityErrorResult
} from "./custom-errors";

/**
 * Contains helper methods to generate a HTTP response.
 */
export class APIResponseBuilder {
  public static setHeaders(headerArray: Array<[string, string]>) {
    for (const item of headerArray) {
      APIResponseBuilder.defaultHeaders[item[0]] = item[1];
    }
  }
  public static setBase64Encoding(flag: boolean) {
    APIResponseBuilder.base64Encoding = flag;
  }

  public static badRequest(errorResult: BadRequestResult, callback: ApiCallback, origin?: string): void {
    APIResponseBuilder._returnAs<BadRequestResult>(errorResult, HttpStatusCode.BAD_REQUEST, callback, origin);
  }

  public static forbidden(errorResult: ForbiddenResult | InsufficientAccountPermissions, callback: ApiCallback, origin?: string): void {
    APIResponseBuilder._returnAs<ForbiddenResult | InsufficientAccountPermissions>(errorResult, HttpStatusCode.FORBIDDEN, callback, origin);
  }

  public static internalServerError(errorResult: InternalServerErrorResult, callback: ApiCallback, origin?: string): void {
    APIResponseBuilder._returnAs<InternalServerErrorResult>(errorResult, HttpStatusCode.INTERNAL_SERVER_ERROR, callback, origin);
  }

  public static notFound(errorResult: NotFoundResult, callback: ApiCallback, origin?: string): void {
    APIResponseBuilder._returnAs<NotFoundResult>(errorResult, HttpStatusCode.NOT_FOUND, callback, origin);
  }

  public static unauthorized(errorResult: UnAuthorizedResult, callback: ApiCallback, origin?: string): void {
    APIResponseBuilder._returnAs<UnAuthorizedResult>(errorResult, HttpStatusCode.UNAUTHORIZED, callback, origin);
  }

  public static unprocessableEntity(errorResult: UnprocessableEntityErrorResult, callback: ApiCallback, origin?: string): void {
    APIResponseBuilder._returnAs<UnprocessableEntityErrorResult>(errorResult, HttpStatusCode.UNPROCESSABLE_ENTITY, callback, origin);
  }

  public static ok<T>(result: T, callback: ApiCallback, origin?: string): void {
    APIResponseBuilder._returnAs<T>(result, HttpStatusCode.OK, callback, origin);
  }

  public static accepted<T>(result: T, callback: ApiCallback, contentLocation: string, origin?: string): void {
    APIResponseBuilder.defaultHeaders["Content-Location"] = contentLocation;
    APIResponseBuilder._returnAs<T>(result, HttpStatusCode.ACCEPTED, callback, origin);
  }

  public static nocontent<T>(result: T, callback: ApiCallback, origin?: string): void {
    APIResponseBuilder._returnAs(result, HttpStatusCode.NO_CONTENT, callback, origin);
  }

  public static multistatus(errorResult: MultiStatusResult | InsufficientAccountPermissions, callback: ApiCallback, origin?: string): void {
    APIResponseBuilder._returnAs<MultiStatusResult | InsufficientAccountPermissions>(errorResult, HttpStatusCode.MULTI_STATUS, callback, origin);
  }
  private static defaultHeaders = {
    [Constants.CONTENT_TYPE]: config.data.headers.contentTypes.json,
    [Constants.HEADER_STRICT_TRANSPORT_SECURITY]: Constants.HEADER_STRICT_TRANSPORT_SECURITY_VALUE,
    [Constants.HEADER_X_CONTENT_TYPE]: Constants.HEADER_X_CONTENT_TYPE_VALUE,
    [Constants.HEADER_X_FRAME_OPTIONS]: Constants.HEADER_X_FRAME_OPTIONS_VALUE,
    [Constants.HEADER_X_XSS_PROTECTION]: Constants.HEADER_X_XSS_PROTECTION_VALUE,
    [Constants.HEADER_REFERRER_POLICY]: Constants.HEADER_REFERRER_POLICY_VALUE,
    [Constants.HEADER_CACHE_CONTROL]: Constants.HEADER_CACHE_CONTROL_VALUE,
    [Constants.HEADER_CONTENT_SECURITY_POLICY]: Constants.HEADER_CONTENT_SECURITY_POLICY_VALUE
  };

  private static base64Encoding: boolean = false;

  private static _returnAs<T>(result: T, responseCode: number, callback: ApiCallback, origin?: string): void {
    let bodyObject: any;
    const responseHeaders = APIResponseBuilder.defaultHeaders;

    if (origin) {
      // Adding CORS response headers
      responseHeaders[Constants.HEADER_ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
    } else if (responseHeaders[Constants.HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]) {
      delete responseHeaders[Constants.HEADER_ACCESS_CONTROL_ALLOW_ORIGIN];
    }
    responseHeaders[Constants.HEADER_ACCESS_CONTROL_ALLOW_CREDENTIALS] = Constants.TRUE;

    if (result instanceof ErrorResult) {
      bodyObject = { errors: [result] };
    } else {
      bodyObject = result;
    }
    const outputBody: any = APIResponseBuilder.base64Encoding ? bodyObject : JSON.stringify(bodyObject);
    const response: ApiResponse = {
      statusCode: responseCode,
      headers: responseHeaders,
      body: outputBody,
      isBase64Encoded: APIResponseBuilder.base64Encoding
    };
    callback(null, response);
  }
}
