export const errorCodeMap = {
  InvalidRequest: { value: "InvalidRequest", description: "The request payload is invalid and does not adhere to specification." },
  InvalidBundle: {
    value: "InvalidRequestBundle",
    description:
      "The request bundle is invalid. The size of the bundle should be correct. If supplied all resources should contain unique identifiers and be submitted from same device."
  },
  RequestTooLarge: { value: "RequestTooLarge", description: "The request contains more resources than allowed in a bundle." },
  Forbidden: { value: "InsufficientPermissions", description: "The user does not have sufficient permissions to execute the request." },
  InternalError: { value: "InternalError", description: "The request processing has failed because of an internal error, exception or failure." },
  NotFound: { value: "ResourceNotFound", description: "The resource associated with the request could not be found." },
  InvalidQuery: {
    value: "InvalidParameterValue",
    description: "The request contains an invalid value of parameter "
  },
  InvalidResourceVersion: { value: "InvalidResourceVersion", description: "" },
  InvalidInvite: { value: "InvalidInvite", description: "Invite is invalid because it is in state :" },
  InvalidHeader: { value: "InvalidHeader", description: "The request has failed because Content-Type of request is invalid" },
  MalformedData: { value: "MalformedData", description: "The request data is malformed" },
  ResourceNotEditable: {
    value: "ResourceNotEditable",
    description: "The requested operation failed because a resource associated with the request can not be edited."
  },
  FileNotFound: {
    value: "FileNotFound",
    description: "The requested operation failed because a file associated with the request could not be found."
  },
  InvaidStartDate: { value: "InvaidStartDate", description: "The requested aggregation cannot be processed as the start date is greater than the end date." },
  MissingAggregationCriteria: {
    value: "MissingAggregationCriteria",
    description: "This aggregation request cannot be fulfilled as it does not have any aggregationCriteria specified."
  },
  InvalidReference: { value: "InvalidReference", description: "The request contains invalid resource reference in element " },
  InvalidElement: { value: "InvalidElement", description: "The request contains non-updatable element " },
  MissingParameter: { value: "MissingParameter", description: "The request cannot be fulfilled as one or more required parameters are missing." },
  InvalidIdentifier: { value: "InvalidIdentifier", description: "The request cannot be fulfilled as provided Identifier is invalid." },
  MissingIdentifier: { value: "MissingIdentifier", description: "The request cannot be fulfilled as Identifier is missing." },
  MissingUserProfile: { value: "MissingUserProfile", description: "There is no matching user profile with the details provided to initiate connection." },
  InvalidUserProfile: { value: "InvalidUserProfile", description: "The requested operation cannot be performed as the UserProfile is inactive." }
};
