/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

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
  displayFields: ["informationSource", "subject", "patient", "to", "from", "consentingParty", "inviteeReference", "inviter", "user", "owner", "requester"],
  nonUserDisplayFields: ["device", "medicationPlan"],
  typeAttributeAdditionalFields: ["derivedFrom", "basedOn", "assigner", "focus", "for", "location", "reasonReference"],
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
const settings = {
  medicationactivityaggregation: {
    searchAttributes: [
      {
        map: "informationSource",
        to: "informationSource",
        type: "string"
      },
      { map: "subject", to: "subject", type: "string" },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "dateAsserted", to: "dateAsserted", type: "date", isMultiple: true },
      { map: "plannedDateTime", to: "plannedDateTime", type: "date", isMultiple: true },
      { map: "effectiveDateTime", to: "effectiveDateTime", type: "date", isMultiple: true },
      { map: "medicationPlan", to: "medicationPlan", type: "string" },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "code", to: "dataResource.medicationCodeableConcept.coding[*].code", type: "array" },
      { map: "date", to: "plannedDateTime", type: "date", isMultiple: true },
      { map: "valueCriteria", to: "valueCriteria", type: "multicolumn" },
      {
        map: "clientRequestId",
        to: "meta.clientRequestId",
        type: "string",
        isMultiple: true
      },
      {
        map: "limit",
        type: "number"
      },
      {
        map: "offset",
        type: "number"
      }
    ],
    aggregationFunctions: [
      { functions: ["count"], column: "status", alias: "statuscount" },
      { columns: ["status"] },
      { functions: ["count"], column: "dataResource.taken", alias: "takencount", convertTo: "json" },
      { columns: ["dataResource.taken"], alias: "taken", convertTo: "json" },
      { functions: ["date"], column: "plannedDateTime", alias: "dt" },
      { columns: ["medicationPlan"] },
      { columns: ["dataResource.medicationCodeableConcept"], alias: "code", convertTo: "json", cast: "jsonb" }
    ],
    groupBy: [`code`, "medicationPlan", `dt`, "status", `taken`],
    orderBy: ["dt ASC"]
  },
  medicationplanaggregation: {
    searchAttributes: [
      {
        map: "id",
        to: "id",
        type: "string",
        isMultiple: true
      },
      { map: "subject", to: "subject", type: "string" }
    ]
  },
  careTeamSearchAttributes: {
    status: {
      to: [
        {
          columnHierarchy: "status",
          columnValueType: "string"
        }
      ],
      dataType: "string",
      isMultiple: true
    },
    participant: {
      to: [
        {
          columnHierarchy: "dataResource.participant[*].member.reference",
          columnValueType: "array"
        }
      ],
      dataType: "string"
    },
    isDeleted: {
      to: [
        {
          columnHierarchy: "meta.isDeleted",
          columnValueType: "boolean"
        }
      ],
      dataType: "boolean"
    }
  }
};

const unitsMap = {
  ms: "milliseconds",
  s: "seconds",
  min: "minutes",
  h: "hours",
  d: "days",
  wk: "weeks",
  mo: "months",
  a: "years"
};
export { data, settings, unitsMap };
