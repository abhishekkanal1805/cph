// tslint:disable-next-line typedef variable-name (Acts like a type with static properties.)

export const responseType = {
  badRequest: [
    "INVALID_ID",
    "INVALID_NAME",
    "MISSING_ID",
    "Missing_Body",
    "INVALID_CONSENTINGPARTY_ID",
    "InvalidJSON",
    "InvalidInput",
    "InvalidQueryParameterValue",
    "InvalidRequest",
    "INVALID USER ID",
    "INVALID_Medication_ID",
    "INVALID_EMAIL",
    "Invalid_Email_InviteCode",
    "VersionId_Mismatch",
    "INVALID_COUNT"
  ],
  unauthorized: ["INACTIVE_USER", "UNAUTHORIZED_USER", "MISSING_PERMISSION"],
  notFound: ["Resource_Not_Found", "ConsentingParty_Not_Found", "ActiveConsentNotFound", ""],
  internalServerError: [
    "Attachment_Not_Saved",
    "Attachment_Not_Found",
    "Resource_Not_Saved",
    "unable_To_Generate_Activities",
    "ResourceNotUpdated",
    "UNPROCESSABLE_ENTITY"
  ]
};
