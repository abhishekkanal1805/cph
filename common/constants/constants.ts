class Constants {
  public static readonly BUNDLE = "Bundle";
  public static readonly BUNDLE_TYPE = "searchset";

  public static readonly RESPONSE_TYPE_OK = "ok";
  public static readonly RESPONSE_TYPE_BAD_REQUEST = "badRequest";
  public static readonly UNPROCESSABLE_ENTITY = "unprocessableEntity";
  public static readonly RESPONSE_TYPE_INTERNAL_SERVER_ERROR = "internalServerError";
  public static readonly RESPONSE_TYPE_INSUFFICIENT_ACCOUNT_PERMISSIONS = "forbidden";
  public static readonly RESPONSE_TYPE_NOT_FOUND = "notFound";
  public static readonly RESPONSE_TYPE_UNAUTHORIZED = "unauthorized";
  public static readonly RESPONSE_TYPE_MULTI_STATUS = "multistatus";

  public static readonly FETCH_LIMIT = 2000;
  public static readonly POST_LIMIT = 500;
}

export { Constants };
