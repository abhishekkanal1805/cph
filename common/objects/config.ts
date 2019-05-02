const data = {
  validDatePrefixes: ["gt", "ge", "lt", "le", "eq", ""],
  consent: {
    requiredParams: ["resourceType", "name", "version", "consentingParty", "consentingParty.reference", "consentDateTime"],
    acceptedAttributes: ["consentingParty", "status", "version", "name", "isDeleted", "lastUpdated"],
    attachmentParams: "attachment",
    withdrawParams: "$withdraw",
    searchAttributes: ["status", "version", "name", "isDeleted", "lastUpdated"]
  },
  headers: {
    types: {
      contentType: "Content-Type"
    },
    contentTypes: {
      json: "application/json",
      pdf: "application/pdf"
    }
  },
  dateFields: [
    "lastUpdated",
    "dateAsserted",
    "plannedDateTime",
    "effectiveDateTime",
    "effectiveDate",
    "date",
    "period",
    "authored",
    "siteExpiryDate",
    "siteActivationDate",
    "withdrawalDate"
  ],
  displayFields: ["informationSource", "subject", "patient", "to", "from", "consentingParty", "inviteeReference", "inviter"],
  nonUserDisplayFields: ["device", "medicationPlan"],
  typeAttributeAdditionalFields: ["derivedFrom", "basedOn", "assigner"],
  searchContent: {
    projectionExpression: [
      { key: "articleId", type: "string" },
      { key: "format", type: "string" },
      { key: "title", type: "string" },
      { key: "desc", type: "string" },
      { key: "type", type: "string" },
      { key: "subType", type: "string" },
      { key: "popularity", type: "object" }
    ]
  },
  fileDownload: {
    requiredAttributes: ["articleId", "fileName", "format"]
  }
};

export { data };
