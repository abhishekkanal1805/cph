/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

export const errorCodeMap = {
  QueryGenerationFailed: {
    value: "QueryGenerationFailed",
    description: "Query to process request failed due to malformed request parameters or data sharing criteria"
  },
  MissingElement: { value: "MissingElement", description: "The request is missing element " },
  InvalidElementValue: { value: "InvalidElementValue", description: "The resource contains an invalid value of element " },
  InvalidRequest: { value: "InvalidRequest", description: "The request payload is invalid and does not adhere to specification" },
  InvalidBundle: {
    value: "InvalidRequestBundle",
    description:
      "The request bundle is invalid. The size of the bundle should be correct. If supplied all resources should contain unique identifiers and be submitted from same device"
  },
  RequestTooLarge: { value: "RequestTooLarge", description: "The request contains more resources than allowed in a bundle" },
  Forbidden: { value: "InsufficientPermissions", description: "The user does not have sufficient permissions to execute the request" },
  InternalError: { value: "InternalError", description: "The request processing has failed because of an internal error, exception or failure" },
  NotFound: { value: "ResourceNotFound", description: "The resource associated with the request could not be found" },
  UserProfileNotFound: { value: "UserProfileNotFound", description: "The request contains invalid reference to resource " },
  InvalidParameter: { value: "InvalidParameter", description: "The request contains an invalid parameter " },
  InvalidParameterValue: { value: "InvalidParameterValue", description: "The request contains an invalid value of parameter " },
  InvalidResourceVersion: { value: "InvalidResourceVersion", description: "" },
  InvalidInvite: { value: "InvalidInvite", description: "Invite is invalid because it is in state :" },
  InvalidHeader: { value: "InvalidHeader", description: "The Content-Type of request is invalid" },
  MalformedData: { value: "MalformedData", description: "The request data is malformed" },
  ResourceNotEditable: {
    value: "ResourceNotEditable",
    description: "The resource associated with the request can not be edited"
  },
  ResourceAlreadyExist: {
    value: "ResourceExists",
    description: "The resource already exists with same value of element "
  },
  FileNotFound: {
    value: "FileNotFound",
    description: "The requested operation failed because a file associated with the request could not be found"
  },
  InvalidStartDate: { value: "InvalidStartDate", description: "The requested aggregation cannot be processed as the start date is greater than the end date" },
  MissingAggregationCriteria: {
    value: "MissingAggregationCriteria",
    description: "This aggregation request cannot be fulfilled as it does not have any aggregationCriteria specified"
  },
  InvalidReference: { value: "InvalidReference", description: "The request contains invalid reference in element " },
  InvalidReferenceValue: { value: "InvalidReferenceValue", description: "The request contains invalid reference of " },
  InvalidElement: { value: "InvalidElement", description: "The request contains non-updatable element " },
  MissingParameter: { value: "MissingParameter", description: "The request cannot be fulfilled as one or more required parameters are missing" },
  InvalidIdentifier: { value: "InvalidIdentifier", description: "The request cannot be fulfilled as provided Identifier is invalid" },
  MissingIdentifier: { value: "MissingIdentifier", description: "The request cannot be fulfilled as Identifier is missing" },
  MissingUserProfile: { value: "MissingUserProfile", description: "There is no matching user profile with the details provided to initiate connection" },
  InvalidUserProfile: { value: "InvalidUserProfile", description: "The requested operation cannot be performed as the UserProfile is inactive" },
  UserProfileExists: { value: "UserProfileExists", description: "A UserProfile with requested email already exists" },
  ResourceExists: { value: "ResourceExists", description: "The resource already exists with same value of element(s) " },
  OperationFailed: { value: "OperationFailed", description: "A resource associated with the request contains invalid value of one or more elements" },
  InvalidAcceptLanguage: {
    value: "InvalidAcceptLanguage",
    description: "Multiple languages are not allowed in Accept-Language header"
  },
  InvalidRange: { value: "InvalidRange", description: "The resource contains invalid range between start and end date." }
};
