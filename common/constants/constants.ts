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
  public static readonly FROM_REFERENCE_KEY = "from.reference";
  public static readonly TO_REFERENCE_KEY = "to.reference";
  public static readonly SUBJECT_REFERENCE_KEY = "subject.reference";
  public static readonly PATIENT_REFERENCE_KEY = "patient.reference";
  public static readonly CONSENTING_PARTY_REFERENCE_KEY = "consentingParty.reference";
  public static readonly INFORMATION_SOURCE_ATTRIBUTE = "informationSource";
  public static readonly SUBJECT_ATTRIBUTE = "subject";
  public static readonly PATIENT_ATTRIBUTE = "patient";
  public static readonly CONSENTING_PARTY_ATTRIBUTE = "consentingParty";
  public static readonly CONNECTION_TYPE_PARTNER = "partner";
  public static readonly CONNECTION_TYPE_DELIGATE = "deligate";
  public static readonly CONNECTION_TYPE_FRIEND = "friend";
  public static readonly CONNECTION_TO = "to";
  public static readonly CONNECTION_TYPE = "type";

  public static readonly MEDICATION_PLAN_KEY = "medicationPlan.reference";
  public static readonly MEDICATION_PLAN_ATTRIBUTE = "medicationPlan";
  public static readonly MEDICATION_PLAN_SERVICE = "MedicationPlan";
  public static readonly MEDICATION_ACTIVITY_SERVICE = "MedicationActivity";

  public static readonly SYSTEM_USER = "system";
  public static readonly PATIENT_USER = "patient";
  public static readonly CAREPARTNER_USER = "carepartner";
  public static readonly PRACTITIONER_USER = "practitioner";

  public static readonly EMPTY_VALUE = "";
  public static readonly FORWARD_SLASH = "/";
  public static readonly DOT_VALUE = ".";
  public static readonly SPACE_VALUE = " ";
  public static readonly QUESTION_MARK_VALUE = "?";
  public static readonly COMMA_SPACE_VALUE = ", ";
  public static readonly UNDERSCORE_VALUE = "_";
  public static readonly COMMA_VALUE = ",";
  public static readonly PERCENTAGE_VALUE = "%";
  public static readonly DOUBLE_QUOTE = '"';
  public static readonly SINGLE_QUOTE = "'";
  public static readonly SQUARE_BRACKETS_OPEN = "[";
  public static readonly SQUARE_BRACKETS_CLOSE = "]";
  public static readonly ARRAY_SEARCH_SYMBOL = "[*]";
  public static readonly POSIX_START = "\\m";
  public static readonly POSIX_END = "\\M";
  public static readonly POSIX_ILIKE_OPERATOR = "~*";
  public static readonly ILIKE_OPERATOR = "ilike";

  public static readonly ACTIVE = "active";
  public static readonly INACTIVE = "inactive";
  public static readonly PENDING = "pending";
  public static readonly IN_PROGRESS = "in-progress";
  public static readonly RETIRED = "retired";
  public static readonly GET_OBJECT = "getObject";
  public static readonly PUT_OBJECT = "putObject";
  public static readonly CONNECTION_FROM = "from";
  public static readonly CONNECTION = "connection";
  public static readonly RESOURCE_TYPE = "resourceType";
  public static readonly CONTENT_TYPE_DEFAULT = "application/json";
  public static readonly CONTENT_TYPE_PDF = "application/pdf";
  public static readonly CONTENT_TYPE_PNG = "image/png";
  public static readonly CONTENT_TYPE = "Content-Type";
  public static readonly CONTENT_TYPE_MULTIPART = "multipart/form-data";
  public static readonly USERPROFILE_REFERENCE = "UserProfile/";
  public static readonly PDF_EXTENSION = ".pdf";
  public static readonly ATTACHMENT = "attachment";
  public static readonly URL_SPLIT_OPERATOR = ".com/";
  public static readonly BINARY = "binary";
  public static readonly BASE64 = "base64";
  public static readonly CUSTOM_GROUP = "custom:group";
  public static readonly SELF = "self";
  public static readonly NEXT = "next";
  public static readonly MATCH = "match";

  public static readonly POST_ENDPOINT = "POST";
  public static readonly GET_ENDPOINT = "GET";
  public static readonly SEARCH_ENDPOINT = "SEARCH";
  public static readonly PUT_ENDPOINT = "PUT";
  public static readonly DELETE_ENDPOINT = "DELETE";
  public static readonly OPERATIONAL_CREATE = "OPERATIONAL-CREATE";
  public static readonly OPERATIONAL_UPDATE = "OPERATIONAL-UPDATE";
  public static readonly OPERATIONAL_DELETE = "OPERATIONAL-DELETE";

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
  public static readonly TYPE_ARRAY = "array";

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

  public static readonly DEFAULT_SEARCH_ATTRIBUTES = "dataResource";
  public static readonly DEFAULT_ORDER_BY = [["meta.lastUpdated", "DESC"]];

  public static readonly FHIR_ALLERGY_INTOLERANCE = "FhirAllergyIntolerance";
  public static readonly FHIR_CONDITION = "FhirCondition";
  public static readonly FHIR_IMMUNIZATION = "FhirImmunization";
  public static readonly FHIR_MEDICATION_STATEMENT = "FhirMedicationStatement";
  public static readonly FHIR_MEDICATION_ORDER = "FhirMedicationOrder";
  public static readonly FHIR_OBSERVATION = "FhirObservation";
  public static readonly FHIR_PROCEDURE = "FhirProcedure";
  public static readonly DEVICE = "Device";
  public static readonly APPOINTMENT = "Appointment";
  public static readonly PERMANENT = "permanent";
}

export { Constants };
