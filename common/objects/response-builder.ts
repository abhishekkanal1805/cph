import * as HttpStatusCode from "http-status-codes";
import * as log from "lambda-log";
import { ApiCallback, ApiResponse } from "./api-interfaces";
import * as config from "./config";
import {
  BadRequestResult,
  ErrorResult,
  ForbiddenResult,
  InsufficientAccountPermissions,
  InternalServerErrorResult,
  NotFoundResult,
  UnAuthorizedResult
} from "./errors";
import {UnprocessableEntityErrorResult} from "./unprocessableEntityErrorResult";

/**
 * Contains helper methods to generate a HTTP response.
 */
export class ResponseBuilder {
  public static setHeaders(headerArray: Array<[string, string]>) {
    for (const item of headerArray) {
      ResponseBuilder.defaultHeaders[item[0]] = item[1];
    }
  }
  public static setBase64Encoding(flag: boolean) {
    ResponseBuilder.base64Encoding = flag;
  }

  public static badRequest(errorResult: BadRequestResult, callback: ApiCallback): void {
    log.error("Error code: " + errorResult.errorCode + ", Error Message: " + errorResult.description);
    ResponseBuilder._returnAs<BadRequestResult>(errorResult, HttpStatusCode.BAD_REQUEST, callback);
  }

  public static forbidden(errorResult: ForbiddenResult | InsufficientAccountPermissions, callback: ApiCallback): void {
    log.error("Error code: " + errorResult.errorCode + ", Error Message: " + errorResult.description);
    ResponseBuilder._returnAs<ForbiddenResult | InsufficientAccountPermissions>(
      errorResult,
      HttpStatusCode.FORBIDDEN,
      callback
    );
  }

  public static internalServerError(errorResult: InternalServerErrorResult, callback: ApiCallback): void {
    log.error("Error code: " + errorResult.errorCode + ", Error Message: " + errorResult.description);
    ResponseBuilder._returnAs<InternalServerErrorResult>(errorResult, HttpStatusCode.INTERNAL_SERVER_ERROR, callback);
  }

  public static notFound(errorResult: NotFoundResult, callback: ApiCallback): void {
    log.error("Error code: " + errorResult.errorCode + ", Error Message: " + errorResult.description);
    ResponseBuilder._returnAs<NotFoundResult>(errorResult, HttpStatusCode.NOT_FOUND, callback);
  }

  public static unauthorized(errorResult: UnAuthorizedResult, callback: ApiCallback): void {
    log.error("Error code: " + errorResult.errorCode + ", Error Message: " + errorResult.description);
    ResponseBuilder._returnAs<UnAuthorizedResult>(errorResult, HttpStatusCode.UNAUTHORIZED, callback);
  }

  public static unprocessableEntity(errorResult: UnprocessableEntityErrorResult, callback: ApiCallback): void {
    log.error("Error code: " + errorResult.errorCode + ", Error Message: " + errorResult.description);
    ResponseBuilder._returnAs<UnprocessableEntityErrorResult>(
      errorResult,
      HttpStatusCode.UNPROCESSABLE_ENTITY,
      callback
    );
  }

  public static ok<T>(result: T, callback: ApiCallback): void {
    ResponseBuilder._returnAs<T>(result, HttpStatusCode.OK, callback);
  }

  public static noContent<T>(result: T, callback: ApiCallback): void {
    ResponseBuilder._returnAs<T>(result, HttpStatusCode.NO_CONTENT, callback);
  }
  private static defaultHeaders = {
    "Content-Type": config.data.headers.contentTypes.json
  };
  private static base64Encoding: boolean = false;

  private static _returnAs<T>(result: T, responseCode: number, callback: ApiCallback): void {
    let bodyObject: any;
    if (result instanceof ErrorResult) {
      bodyObject = { errors: [result] };
    } else if (result[0] instanceof ErrorResult) {
      bodyObject = { errors: result };
    } else {
      bodyObject = result;
    }
    const outputBody: any = ResponseBuilder.base64Encoding ? bodyObject : JSON.stringify(bodyObject);
    const response: ApiResponse = {
      statusCode: responseCode,
      headers: ResponseBuilder.defaultHeaders,
      body: outputBody,
      isBase64Encoded: ResponseBuilder.base64Encoding
    };
    callback(null, response);
  }
}
