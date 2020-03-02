/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

class Constants {
  public static readonly BUNDLE = "Bundle";
  public static readonly BUNDLE_TYPE = "searchset";

  public static readonly RESPONSE_TYPE_OK = "ok";
  public static readonly RESPONSE_TYPE_ACCEPTED = "accepted";
  public static readonly RESPONSE_TYPE_BAD_REQUEST = "badRequest";
  public static readonly UNPROCESSABLE_ENTITY = "unprocessableEntity";
  public static readonly RESPONSE_TYPE_INTERNAL_SERVER_ERROR = "internalServerError";
  public static readonly RESPONSE_TYPE_INSUFFICIENT_ACCOUNT_PERMISSIONS = "forbidden";
  public static readonly RESPONSE_TYPE_NOT_FOUND = "notFound";
  public static readonly RESPONSE_TYPE_UNAUTHORIZED = "unauthorized";
  public static readonly RESPONSE_TYPE_MULTI_STATUS = "multistatus";
  public static readonly RESPONSE_TYPE_NO_CONTENT = "nocontent";
  public static readonly SEQUELIZE_DATABASE_ERROR = "SequelizeDatabaseError";
  public static readonly SEQUELIZE_UNIQUECONSTRAINT_ERROR = "SequelizeUniqueConstraintError";
  public static readonly SEQUELIZE_CLIENTREQUESTID_ERROR = "(meta ->> 'clientRequestId'::text)";

  public static readonly FETCH_LIMIT = 2000;
  public static readonly POST_LIMIT = 500;
  public static readonly DEFAULT_OFFSET = 0;

  public static readonly BOUNDSPERIOD_LIMIT = 90;
  public static readonly DEVICE_REFERENCE_KEY = "meta.deviceId";
  public static readonly META_IS_DELETED_KEY = "meta.isDeleted";
  public static readonly INFORMATION_SOURCE_REFERENCE_KEY = "informationSource.reference";
  public static readonly FROM_REFERENCE_KEY = "from.reference";
  public static readonly TO_REFERENCE_KEY = "to.reference";
  public static readonly SUBJECT_REFERENCE_KEY = "subject.reference";
  public static readonly PATIENT_REFERENCE_KEY = "patient.reference";
  public static readonly CONSENTING_PARTY_REFERENCE_KEY = "consentingParty.reference";
  public static readonly INFORMATION_SOURCE_ATTRIBUTE = "informationSource";
  public static readonly INDIVIDUAL_REFERENCE_KEY = "individual.reference";
  public static readonly REFERENCE_ATTRIBUTE = "reference";
  public static readonly SUBJECT_ATTRIBUTE = "subject";
  public static readonly PATIENT_ATTRIBUTE = "patient";
  public static readonly CONSENTING_PARTY_ATTRIBUTE = "consentingParty";
  public static readonly CONNECTION_TYPE_PARTNER = "partner";
  public static readonly CONNECTION_TYPE_DELIGATE = "delegate";
  public static readonly CONNECTION_TYPE_FRIEND = "friend";
  public static readonly CONNECTION_TO = "to";
  public static readonly CONNECTION_TYPE = "type";
  public static readonly STATUS = "status";
  public static readonly REQUEST_EXPIRATION_DATE = "requestExpirationDate";
  public static readonly META_ATTRIBUTE = "meta";
  public static readonly DEVICE_ID_ATTRIBUTE = "deviceId";
  public static readonly CLIENT_REQUEST_ID_ATTRIBUTE = "clientRequestId";
  public static readonly SOURCE_ATTRIBUTE = "source";

  public static readonly MEDICATION_PLAN_KEY = "medicationPlan.reference";
  public static readonly MEDICATION_PLAN_ATTRIBUTE = "medicationPlan";
  public static readonly MEDICATION_PLAN_SERVICE = "MedicationPlan";
  public static readonly MEDICATION_ACTIVITY_SERVICE = "MedicationActivity";

  public static readonly POLICY_EFFECT_ALLOW = "allow";
  public static readonly POLICY_STATUS_ACTIVE = "active";

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
  public static readonly OPENING_PARENTHESES = "(";
  public static readonly CLOSING_PARENTHESES = ")";
  public static readonly HYPHEN = "-";
  public static readonly S3ENCRYPTION = "aws:kms";
  public static readonly DEFALULT_ACCEPT_LANGUAGE = "*";

  public static readonly FAMILYNAME_ATTRIBUTE = "name.family";
  public static readonly IDENTIFIER_ATTRIBUTE = "identifier";
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
  public static readonly ACCEPT_LANGUAGE = "accept-language";
  public static readonly CONTENT_LANGUAGE = "content-language";
  public static readonly CONTENT_TYPE_MULTIPART = "multipart/form-data";
  public static readonly USERPROFILE_REFERENCE = "UserProfile/";
  public static readonly RESEARCHSUBJECT_REFERENCE = "ResearchSubject/";
  public static readonly POLICY_REFERENCE = "Policy/";
  public static readonly STUDY_SITE_REFERENCE = "StudySite/";
  public static readonly STUDY_REFERENCE = "Study/";
  public static readonly INDIVIDUAL = "individual";
  public static readonly PDF_EXTENSION = ".pdf";
  public static readonly ATTACHMENT = "attachment";
  public static readonly URL_SPLIT_OPERATOR = ".com/";
  public static readonly BINARY = "binary";
  public static readonly BASE64 = "base64";
  public static readonly CUSTOM_GROUP = "custom:group";
  public static readonly SELF = "self";
  public static readonly NEXT = "next";
  public static readonly MATCH = "match";
  public static readonly INCLUDE = "include";
  public static readonly EXTENSION = "extension";
  public static readonly CONTENT = "content";
  public static readonly LANGUAGE = "lang";
  public static readonly OBJECT = "object";

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

  public static readonly DATE_TIME = "YYYY-MM-DDTHH:mm:ss.SSSZ";
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
  public static readonly PREFIX_NOT_EQUAL = "ne";
  public static readonly OPERATION_OR = "OR";
  public static readonly OPERATION_AND = "AND";

  public static readonly GREATER_THAN = ">";
  public static readonly GREATER_THAN_EQUAL = ">=";
  public static readonly LESS_THAN = "<";
  public static readonly LESS_THAN_EQUAL = "<=";
  public static readonly EQUAL = "=";
  public static readonly NOT_EQUAL_OPERATOR = "!=";

  public static readonly OPERATION_LIKE = "like";
  public static readonly OPERATION_STARTS_WITH = "startsWith";
  public static readonly OPERATION_ENDS_WITH = "endsWith";
  public static readonly OPERATION_WORD_MATCH = "wordMatch";
  public static readonly OPERATION_NUMERIC_MATCH = "numericMatch";

  public static readonly PERIOD_DAYS = "days";
  public static readonly PERIOD_MONTHS = "months";
  public static readonly PERIOD_YEARS = "years";

  public static readonly RESOURCES_ACCESSIBLE_TO_ALL = ["Questionnaire"];
  public static readonly DEFAULT_SEARCH_ATTRIBUTES = "dataResource";
  public static readonly DEFAULT_ORDER_BY = [["meta.lastUpdated", "DESC"]];
  public static readonly RESEARCH_SUBJECT_WITHDRAW_STATUS = ["withdrawn", "ineligible", "not-registered"];

  public static readonly PRIVATE_RESOURCE_TYPE = "private";
  public static readonly ACCESS_TYPE = "accessType";

  /* Sharing Rule Constants */
  public static readonly DATE_PATTERN =
    "^-?[0-9]{4}(-(0[1-9]|1[0-2])(-(0[0-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\\\.[0-9]+)?(Z|(\\\\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?$";
  public static readonly NOT_EQUAL = "notEqual";
  public static readonly DAYS_IN_WEEK = {
    MON: 1,
    MONDAY: 1,
    TUES: 2,
    TUESDAY: 2,
    WED: 3,
    WEDNESDAY: 3,
    THUR: 4,
    THURSDAY: 4,
    FRI: 5,
    FRIDAY: 5,
    SAT: 6,
    SATURDAY: 6,
    SUN: 0,
    SUNDAY: 0
  };
  public static readonly MONTHS_IN_YEAR = {
    JANUARY: 0,
    JAN: 0,
    FEBRUARY: 1,
    FEB: 1,
    MARCH: 2,
    MAR: 2,
    APRIL: 3,
    APR: 3,
    MAY: 4,
    JUNE: 5,
    JUN: 5,
    JULY: 6,
    JUL: 6,
    AUGUST: 7,
    AUG: 7,
    SEPTEMBER: 8,
    SEP: 8,
    OCTOBER: 9,
    OCT: 9,
    NOVEMBER: 10,
    NOV: 10,
    DECEMBER: 11,
    DEC: 11
  };
  public static readonly TYPE_SINGLE = "single";
  public static readonly TYPE_GROUP = "group";
  public static readonly ACCESS_READ = "read";
  public static readonly ACCESS_EDIT = "edit";
  public static readonly PUBLIC_ACCESS_READ_ONLY = "public-read-only";
  public static readonly PUBLIC_ACCESS_READ_WRITE = "public-read-write";

  public static readonly QUESTIONNAIRE_TITLE_IMAGE = "titleImage";
  public static readonly TITLE_IMAGE_CONTENT_TYPE = "contentType";
  public static readonly TITLE_IMAGE_CREATION = "creation";
  public static readonly TITLE_IMAGE_URL = "url";

  public static readonly FHIR_ALLERGY_INTOLERANCE = "FhirAllergyIntolerance";
  public static readonly FHIR_CONDITION = "FhirCondition";
  public static readonly FHIR_IMMUNIZATION = "FhirImmunization";
  public static readonly FHIR_MEDICATION_STATEMENT = "FhirMedicationStatement";
  public static readonly FHIR_MEDICATION_ORDER = "FhirMedicationOrder";
  public static readonly FHIR_OBSERVATION = "FhirObservation";
  public static readonly FHIR_PROCEDURE = "FhirProcedure";
  public static readonly DEVICE = "Device";
  public static readonly APPOINTMENT = "Appointment";
  public static readonly CONNECTION_SERVICE = "Connection";
  public static readonly PERMANENT = "permanent";
  public static readonly TRUE = true;
  public static readonly FALSE = false;
  public static readonly USER_PROFILE = "UserProfile";
  public static readonly RESEARCH_SUBJECT = "ResearchSubject";
  public static readonly LIMIT = "limit";
  public static readonly OFFSET = "offset";

  public static readonly HEADER_STRICT_TRANSPORT_SECURITY = "Strict-Transport-Security";
  public static readonly HEADER_STRICT_TRANSPORT_SECURITY_VALUE = "max-age=63072000; includeSubdomains; preload";
  public static readonly HEADER_X_CONTENT_TYPE = "X-Content-Type-Options";
  public static readonly HEADER_X_CONTENT_TYPE_VALUE = "nosniff";
  public static readonly HEADER_X_FRAME_OPTIONS = "X-Frame-Options";
  public static readonly HEADER_X_FRAME_OPTIONS_VALUE = "DENY";
  public static readonly HEADER_X_XSS_PROTECTION = "X-XSS-Protection";
  public static readonly HEADER_X_XSS_PROTECTION_VALUE = "1; mode=block";
  public static readonly HEADER_REFERRER_POLICY = "Referrer-Policy";
  public static readonly HEADER_REFERRER_POLICY_VALUE = "same-origin";
  public static readonly HEADER_CACHE_CONTROL = "Cache-Control";
  public static readonly HEADER_CACHE_CONTROL_VALUE = "no-store, no-cache, max-age=0, must-revalidate";
  public static readonly HEADER_CONTENT_SECURITY_POLICY = "Content-Security-Policy";
  public static readonly HEADER_CONTENT_SECURITY_POLICY_VALUE = "default-src 'self'; object-src 'none';";
  public static readonly HEADER_ACCESS_CONTROL_ALLOW_ORIGIN = "Access-Control-Allow-Origin";
  public static readonly HEADER_ACCESS_CONTROL_ALLOW_CREDENTIALS = "Access-Control-Allow-Credentials";
  public static readonly USER_ATTRIBUTE = "user";
  public static readonly USER_REFERENCE_KEY = "user.reference";

  public static readonly TIMING_CODE = "timing.code";
  public static readonly TIMING_TIME_OF_DAY = "timing.repeat.timeOfDay";
  public static readonly INTERNAL_DATE_FORMAT = "DD.MM.YYYY";

  public static readonly DAY_END_TIME = "23:59:59";
  public static readonly DAY_START_TIME = "00:00:00";
  public static readonly FHIR_SECOSND_UNIT = "s";
  public static readonly FHIR_MINUTE_UNIT = "min";
  public static readonly FHIR_HOUR_UNIT = "h";
  public static readonly FHIR_DAY_UNIT = "d";
  public static readonly FHIR_WEEK_UNIT = "wk";
  public static readonly FHIR_MONTH_UNIT = "mo";
  public static readonly FHIR_YEAR_UNIT = "a";
  public static readonly ALLOWED_UNITS = ["s", "min", "h"];
  public static readonly ALLOWED_DURATION_UNITS = ["d", "wk", "mo", "a"];
  public static readonly DAYS = "days";
  public static readonly DAY = "day";
  public static readonly YEARS = "years";
  public static readonly DATE_TIME_ONLY = "YYYY-MM-DDTHH:mm:ss.SSS";
  public static readonly DURATION_UNITS = ["s", "min", "h", "d"];
  public static readonly TIMEZONE_FORMAT = "Z";
}
export { Constants };
