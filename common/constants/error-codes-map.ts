export const errorCodeMap = {
  InvalidRequest: { value: "InvalidRequest", description: "The request payload is invalid and does not adhere to specification." },
  InvalidBundle: {
    value: "InvalidRequestBundle",
    description:
      "The request bundle is invalid. The size of the bundle should be correct. If supplied all resources should contain unique identifiers and be submitted from same device."
  },
  RequestTooLarge: { value: "RequestTooLarge", description: "The request contains more resources than allowed in a bundle." },
  Forbidden: { value: "Forbidden", description: "The requested operation is forbidden and cannot be completed." },
  InternalError: { value: "InternalError", description: "The request processing has failed because of an internal error, exception or failure." },
  NotFound: { value: "NotFound", description: "The requested operation failed because a resource associated with the request could not be found." },
  InvalidQuery: {
    value: "InvalidQuery",
    description: "The request contains an invalid combination of parameters or an invalid parameter value. Check the value of parameter : "
  },
  InvalidResourceVersion: { value: "InvalidResourceVersion", description: "" },
  InvalidParameterValue: { value: "InvalidParameterValue", description: "The request failed because it contained an invalid parameter or parameter value." },
  InvalidInvite: { value: "InvalidInvite", description: "Invite is invalid because it is in state :"},
  InvalidHeader: { value: "InvalidHeader", description: "The request has failed because Content-Type of request is invalid"},
  MissingResource: { value: "MissingResource", description: "The request must contain a valid Consent resource"}
};
