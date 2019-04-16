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
  public static readonly RESPONSE_TYPE_NO_CONTENT = "nocontent";

  public static readonly FETCH_LIMIT = 2000;
  public static readonly POST_LIMIT = 500;
  public static readonly DEFAULT_OFFSET = 0;

  public static readonly BOUNDSPERIOD_LIMIT = 90;
  public static readonly DEVICE_REFERENCE_KEY = "meta.deviceId";
  public static readonly INFORMATION_SOURCE_REFERENCE_KEY = "informationSource.reference";
  public static readonly SUBJECT_REFERENCE_KEY = "subject.reference";
  public static readonly PATIENT_REFERENCE_KEY = "patient.reference";

  public static readonly SYSTEM_USER = "system";
  public static readonly PATIENT_USER = "patient";
  public static readonly CAREPARTNER_USER = "carepartner";
  public static readonly PRACTITIONER_USER = "practitioner";

  public static readonly DOT_VALUE = ".";
  public static readonly SPACE_VALUE = " ";
  public static readonly COMMA_SPACE_VALUE = ", ";
  public static readonly COMMA_VALUE = ",";
  public static readonly PERCENTAGE_VALUE = "%";
  public static readonly DOUBLE_QUOTE = '"';
  public static readonly SINGLE_QUOTE = "'";
  public static readonly SQUARE_BRACKETS_OPEN = "[";
  public static readonly SQUARE_BRACKETS_CLOSE = "]";

  public static readonly ACTIVE = "active";
  public static readonly CONNECTION_FROM = "from";
  public static readonly CONNECTION = "connection";
  public static readonly CONTENT_TYPE_DEFAULT = "application/json";
  public static readonly CONTENT_TYPE_MULTIPART = "multipart/form-data";
  public static readonly USERPROFILE_REFERENCE = "UserProfile/";

  public static readonly ID = "id";

  public static readonly IS_DELETED = "isDeleted";
  public static readonly IS_DELETED_DEFAULT_VALUE = "false";
  public static readonly IS_TRUE = "true";

  public static readonly DATE_TIME = "YYYY-MM-DDTHH:mm:ss.SSSSZ";
  public static readonly DATE = "YYYY-MM-DD";
  public static readonly YEAR_MONTH = "YYYY-MM";
  public static readonly YEAR = "YYYY";

  public static readonly ATTRIBUTE_DATA_TYPE = "dataType";
  public static readonly ATTRIBUTE_IS_MULTIPLE = "isMultiple";

  public static readonly TYPE_DATE = "date";
  public static readonly TYPE_NUMBER = "number";
  public static readonly TYPE_BOOLEAN = "boolean";
  public static readonly TYPE_STRING = "string";

  public static readonly PREFIX_GREATER_THAN = "gt";
  public static readonly PREFIX_GREATER_THAN_EQUAL = "ge";
  public static readonly PREFIX_LESS_THAN = "lt";
  public static readonly PREFIX_LESS_THAN_EQUAL = "le";
  public static readonly PREFIX_EQUAL = "eq";

  public static readonly OPERATION_LIKE = "like";
  public static readonly OPERATION_STARTS_WITH = "startsWith";
  public static readonly OPERATION_ENDS_WITH = "endsWith";
  public static readonly OPERATION_WORD_MATCH = "wordMatch";

  public static readonly PERIOD_DAYS = "days";
  public static readonly PERIOD_MONTHS = "months";
  public static readonly PERIOD_YEARS = "years";

  public static readonly DEFAULT_SEARCH_ATTRIBUTES = ["dataResource"];
  public static readonly DEFAULT_ORDER_BY = [["meta.lastUpdated", "DESC"]];
}

export { Constants };
