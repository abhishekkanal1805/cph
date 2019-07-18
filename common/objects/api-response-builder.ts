import * as HttpStatusCode from "http-status-codes";
import { I18N } from "../../services/i18n/i18n";
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

  public static setContentLanguage() {
    APIResponseBuilder.defaultHeaders[Constants.CONTENT_LANGUAGE] = I18N.getContentLanguage();
    I18N.resetContentLanguage();
  }

  public static badRequest(errorResult: BadRequestResult, callback: ApiCallback): void {
    APIResponseBuilder._returnAs<BadRequestResult>(errorResult, HttpStatusCode.BAD_REQUEST, callback);
  }

  public static forbidden(errorResult: ForbiddenResult | InsufficientAccountPermissions, callback: ApiCallback): void {
    APIResponseBuilder._returnAs<ForbiddenResult | InsufficientAccountPermissions>(errorResult, HttpStatusCode.FORBIDDEN, callback);
  }

  public static internalServerError(errorResult: InternalServerErrorResult, callback: ApiCallback): void {
    APIResponseBuilder._returnAs<InternalServerErrorResult>(errorResult, HttpStatusCode.INTERNAL_SERVER_ERROR, callback);
  }

  public static notFound(errorResult: NotFoundResult, callback: ApiCallback): void {
    APIResponseBuilder._returnAs<NotFoundResult>(errorResult, HttpStatusCode.NOT_FOUND, callback);
  }

  public static unauthorized(errorResult: UnAuthorizedResult, callback: ApiCallback): void {
    APIResponseBuilder._returnAs<UnAuthorizedResult>(errorResult, HttpStatusCode.UNAUTHORIZED, callback);
  }

  public static unprocessableEntity(errorResult: UnprocessableEntityErrorResult, callback: ApiCallback): void {
    APIResponseBuilder._returnAs<UnprocessableEntityErrorResult>(errorResult, HttpStatusCode.UNPROCESSABLE_ENTITY, callback);
  }

  public static ok<T>(result: T, callback: ApiCallback): void {
    APIResponseBuilder._returnAs<T>(result, HttpStatusCode.OK, callback);
  }

  public static nocontent<T>(result: T, callback: ApiCallback): void {
    APIResponseBuilder._returnAs(result, HttpStatusCode.NO_CONTENT, callback);
  }

  public static multistatus(errorResult: MultiStatusResult | InsufficientAccountPermissions, callback: ApiCallback): void {
    APIResponseBuilder._returnAs<MultiStatusResult | InsufficientAccountPermissions>(errorResult, HttpStatusCode.MULTI_STATUS, callback);
  }
  private static defaultHeaders = {
    [Constants.CONTENT_TYPE]: config.data.headers.contentTypes.json,
    [Constants.HEADER_STRICT_TRANSPORT_SECURITY]: Constants.HEADER_STRICT_TRANSPORT_SECURITY_VALUE,
    [Constants.HEADER_X_CONTENT_TYPE]: Constants.HEADER_X_CONTENT_TYPE_VALUE,
    [Constants.HEADER_X_FRAME_OPTIONS]: Constants.HEADER_X_FRAME_OPTIONS_VALUE,
    [Constants.HEADER_X_XSS_PROTECTION]: Constants.HEADER_X_XSS_PROTECTION_VALUE,
    [Constants.HEADER_REFERRER_POLICY]: Constants.HEADER_REFERRER_POLICY_VALUE
  };

  private static base64Encoding: boolean = false;

  private static _returnAs<T>(result: T, responseCode: number, callback: ApiCallback): void {
    APIResponseBuilder.setContentLanguage();
    let bodyObject: any;
    if (result instanceof ErrorResult) {
      bodyObject = { errors: [result] };
    } else {
      bodyObject = result;
    }
    const outputBody: any = APIResponseBuilder.base64Encoding ? bodyObject : JSON.stringify(bodyObject);
    const response: ApiResponse = {
      statusCode: responseCode,
      headers: APIResponseBuilder.defaultHeaders,
      body: outputBody,
      isBase64Encoded: APIResponseBuilder.base64Encoding
    };
    callback(null, response);
  }
}
