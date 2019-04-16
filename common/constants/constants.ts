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

  public static readonly BOUNDSPERIOD_LIMIT = 90;
  public static readonly DEVICE_REFERENCE_KEY = "meta.deviceId";
  public static readonly INFORMATION_SOURCE_REFERENCE_KEY = "informationSource.reference";
  public static readonly SUBJECT_REFERENCE_KEY = "subject.reference";
  public static readonly PATIENT_REFERENCE_KEY = "patient.reference";
  public static readonly MEDICATION_PLAN_KEY = "medicationPlan.reference";
  public static readonly MEDICATION_PLAN_ATTRIBUTE = "medicationPlan";
  public static readonly MEDICATION_PLAN_SERVICE = "MedicationPlan";
  public static readonly MEDICATION_ACTIVITY_SERVICE = "MedicationActivity";

  public static readonly SYSTEM_USER = "system";
  public static readonly PATIENT_USER = "patient";
  public static readonly CAREPARTNER_USER = "carepartner";
  public static readonly PRACTITIONER_USER = "practitioner";

  public static readonly DOT_VALUE = ".";
  public static readonly SPACE_VALUE = " ";
  public static readonly COMMA_SPACE_VALUE = ", ";
  public static readonly SLASH_VALUE = "/";

  public static readonly ACTIVE = "active";
  public static readonly CONNECTION_FROM = "from";
  public static readonly CONNECTION = "connection";
  public static readonly CONTENT_TYPE_DEFAULT = "application/json";
  public static readonly CONTENT_TYPE_MULTIPART = "multipart/form-data";
  public static readonly USERPROFILE_REFERENCE = "UserProfile/";

  public static readonly POST_ENDPOINT = "POST";
  public static readonly GET_ENDPOINT = "GET";
  public static readonly SEARCH_ENDPOINT = "SEARCH";
  public static readonly UPDATE_ENDPOINT = "UPDATE";
  public static readonly DELETE_ENDPOINT = "DELETE";
  public static readonly OPERATIONAL_CREATE = "OPERATIONAL-CREATE";
  public static readonly OPERATIONAL_UPDATE = "OPERATIONAL-UPDATE";
  public static readonly OPERATIONAL_DELETE = "OPERATIONAL-DELETE";

  public static readonly ID = "id";
}

export { Constants };
