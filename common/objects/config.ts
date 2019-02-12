const data = {
  validDatePrefixes: ["gt", "ge", "lt", "le", "eq", ""],
  allowedPools: [
    { poolId: "us-east-1_lhwINc4vG", region: "us-east-1" },
    { poolId: "us-east-1_v5ed2jXHP", region: "us-east-1" },
    { poolId: "us-east-1_Vx1IOyGTB", region: "us-east-1" },
    { poolId: "us-east-1_TvzUmxgeq", region: "us-east-1" }, // Mobile Env
    { poolId: "us-east-1_IChCUdoMz", region: "us-east-1" } // Mobile Env
  ],
  consent: {
    requiredParams: ["resourceType", "name", "version", "consentingParty", "consentingParty.reference", "consentDateTime"],
    acceptedAttributes: ["consentingParty", "status", "version", "name", "isDeleted", "lastUpdated"],
    attachmentParams: "attachment",
    withdrawParams: "$withdraw",
    searchAttributes: ["status", "version", "name", "isDeleted", "lastUpdated"]
  },
  controlGroupParams: {
    rwe: "switch1234",
    controlGroup: "ControlGroup",
    rweGroupName: "Patient",
    control: 1,
    enhanced: 2,
    profileInfo: {
      itemId: "SiteInformation",
      text: "Study Site Information",
      type: "group",
      profileItem: [
        {
          itemId: "site",
          text: "site code",
          type: "text",
          isInternal: true,
          answer: [{ valueInteger: "" }]
        },
        {
          itemId: "cohort",
          text: "Study cohort",
          type: "text",
          isInternal: true,
          answer: [{ valueInteger: "" }]
        },
        {
          itemId: "patientId",
          text: "Patient Identifier for the study",
          type: "text",
          isInternal: true,
          answer: [{ valueString: "" }]
        },
        {
          itemId: "switchCode",
          text: "Switch Code",
          type: "text",
          isInternal: true,
          answer: [{ valueString: "" }]
        }
      ]
    }
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
  displayFields: ["informationSource", "subject", "patient", "to", "from", "consentingParty", "actor"],
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
  consent: {
    searchAttributes: [
      { map: "version", to: "version", type: "number" },
      { map: "name", to: "name", type: "string" },
      { map: "status", to: "status", type: "string" },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "consentingParty", to: "consentingParty", type: "string" },
      { map: "id", to: "id", type: "string", isMultiple: true },
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
    requiredParams: ["resourceType", "name", "version", "consentingParty", "consentingParty.reference", "consentDateTime"],
    attachmentParams: "attachment",
    withdrawParams: "$withdraw",
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  fhirmedicationstatement: {
    searchAttributes: [
      {
        map: "informationSource",
        to: "informationSource",
        type: "string"
      },
      { map: "patient", to: "patient", type: "string" },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "dateAsserted", to: "dateAsserted", type: "date", isMultiple: true },
      { map: "effectiveDate", to: "effectiveDateTime", type: "date", isMultiple: true },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
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
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  fhirimmunization: {
    searchAttributes: [
      { map: "patient", to: "patient", type: "string" },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "date", to: "date", type: "date", isMultiple: true },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
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
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  fhirobservation: {
    searchAttributes: [
      { map: "subject", to: "subject", type: "string" },
      { map: "status", to: "status", type: "string" },
      { map: "category", to: "category[*].coding[*].code", type: "array" },
      {
        map: "code",
        to: "code.coding[*].code",
        type: "array",
        isMultiple: true
      },
      {
        map: "date",
        to: "effectiveDateTime",
        type: "date",
        isMultiple: true,
        isPeriod: false,
        condition: " and ",
        periodAttribute: ["effectivePeriod"]
      },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
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
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  observation: {
    searchAttributes: [
      { map: "subject", to: "subject", type: "string" },
      { map: "informationSource", to: "informationSource", type: "string" },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "code", to: "code.coding[*].code", type: "array" },
      { map: "category", to: "category[*].coding[*].code", type: "array" },
      { map: "component-code", to: "component[*].code.coding[*].code", type: "array" },
      {
        map: "date",
        to: "effectiveDateTime",
        type: "date",
        isPeriod: false,
        isMultiple: true,
        condition: " and ",
        periodAttribute: ["effectivePeriod"]
      },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
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
    aggregationAttributes: [{ map: "component-code", to: `componentcode->'coding' @> '[{"code": "%arg%"}]'`, type: "array" }],
    aggregationSubqueryAttributes: [
      { map: "code", to: `"code"->'coding' @> '[{"code": "%arg%"}]'`, type: "array" },
      { map: "category", to: `"category" @> '[{"coding":[{"code":"%arg%"}]}]'`, type: "array" },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      { map: "date", to: "effectiveDateTime", type: "date" },
      { map: "subject", to: "subject", type: "string" }
    ],
    aggregationFunctions: {
      stats: [
        { functions: ["sum", "count", "min", "max", "avg"], column: "valueQuantity.value", cast: "integer" },
        { functions: ["date"], column: "effectiveDateTime", alias: "dt" },
        { columns: ["code"] }
      ],
      histogramSubQuery: [
        { literal: `code` },
        { literal: "(jsonb_array_elements_text(component)::jsonb)->'code'", alias: "componentcode" },
        { literal: "(jsonb_array_elements_text(component)::jsonb)->'valueQuantity'", alias: "valueQuantity" },
        { literal: `date("effectiveDateTime")`, alias: "dt" }
      ],
      histogram: [
        { literal: `count(CAST((valueQuantity#>>'{value}') AS INTEGER))`, alias: "count" },
        { literal: `code` },
        { literal: `componentcode` },
        { literal: `dt` },
        { literal: `valueQuantity` }
      ],
      subQueryAlias: `subquery`,
      groupBy: ["code", "dt"],
      HistogramGroupBy: ["code", "componentcode", "dt", "valueQuantity"],
      orderBy: ["dt ASC"]
    },
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  medicationactivity: {
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

    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
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
    orderBy: ["dt ASC"],

    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  medicationorder: {
    searchAttributes: [
      { map: "patient", to: "patient", type: "string" },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "dateWritten", to: "dateWritten", type: "date", isMultiple: true },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      { map: "clientRequestId", to: "meta.clientRequestId", type: "string", isMultiple: true },
      {
        map: "limit",
        type: "number"
      },
      {
        map: "offset",
        type: "number"
      }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  medicationplan: {
    searchAttributes: [
      {
        map: "informationSource",
        to: "informationSource",
        type: "string"
      },
      { map: "subject", to: "subject", type: "string" },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "dateAsserted", to: "dateAsserted", type: "date", isMultiple: true },
      {
        map: "code",
        to: "code.coding[*].code",
        type: "array"
      },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
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
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
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
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  medicationactivityoperationaldelete: {
    searchAttributes: [
      {
        map: "start",
        to: "plannedDateTime",
        condition: "GreaterThanOrEqualTo",
        type: "date"
      },
      {
        map: "end",
        to: "plannedDateTime",
        condition: "LessThanOrEqualTo",
        type: "date"
      },
      {
        map: "status",
        to: "status",
        condition: "Equals",
        type: "string"
      },
      {
        map: "medicationPlan",
        to: "medicationPlan",
        condition: "Equals",
        type: "string"
      }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  medicationactivityoperationalupdate: {
    searchAttributes: [
      {
        map: "start",
        to: "plannedDateTime",
        condition: "GreaterThanOrEqualTo",
        type: "date"
      },
      {
        map: "end",
        to: "plannedDateTime",
        condition: "LessThanOrEqualTo",
        type: "date"
      },
      {
        map: "medicationPlan",
        to: "medicationPlan",
        condition: "Equals",
        type: "string"
      }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  fhircondition: {
    searchAttributes: [
      { map: "patient", to: "patient", type: "string" },
      { map: "clinicalStatus", to: "clinicalStatus", type: "string", isMultiple: true },
      { map: "category", to: "category.coding[*].code", type: "array" },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
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
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  questionnaire: {
    searchAttributes: [
      { map: "version", to: "version", type: "string" },
      { map: "name", to: "name", type: "string" },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "period", to: "period", type: "number" },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      {
        map: "clientRequestId",
        to: "meta.clientRequestId",
        type: "string",
        isMultiple: true
      }
    ],
    attachmentParams: "attachment",
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  questionnaireresponse: {
    searchAttributes: [
      { map: "authored", to: "authored", type: "date", isMultiple: true },
      { map: "subject", to: "subject", type: "string" },
      { map: "status", to: "status", type: "string", isMultiple: true },
      {
        map: "informationSource",
        to: "informationSource",
        type: "string"
      },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      {
        map: "clientRequestId",
        to: "meta.clientRequestId",
        type: "string",
        isMultiple: true
      }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  invitation: {
    searchAttributes: [
      { map: "inviteeEmail", to: "inviteeEmail", type: "string" },
      { map: "inviteCode", to: "inviteCode", type: "string" },
      { map: "newInvite", to: "newInvite", type: "boolean" },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      {
        map: "inviteeReference",
        to: "inviteeReference",
        type: "string"
      },
      { map: "id", to: "id", type: "string" }
    ],
    allowedAttempts: 6,
    codeValidDurationDays: 1, // day
    requiredParams: ["inviteeEmail", "inviteeReference", "status"],
    acceptedAttributes: ["id", "inviteeEmail", "invitee", "status", "inviteCode", "inviter", "inviteeReference"],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  userprofile: {
    searchAttributes: [
      { map: "id", to: "id", type: "string", isMultiple: true },
      { map: "email", to: "email", type: "string" },
      { map: "userCode", to: "userCode", type: "string" },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
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
    elements: [
      "id",
      "dataResource",
      "name",
      "email",
      "meta",
      "race",
      "ethnicity",
      "gender",
      "birthDate",
      "status",
      "type",
      "telecom",
      "address",
      "preferences",
      "identifier",
      "userCode",
      "npi",
      "dea",
      "additionalAttributes"
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  connection: {
    searchAttributes: [
      { map: "from", to: "from.reference", type: "string", isMultiple: true },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "to", to: "to.reference", type: "string", isMultiple: true },
      { map: "type", to: "type", type: "string", isMultiple: true },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    },
    isUniqueCodeRequired: true
  },
  cmsBatch: {
    searchAttributes: [{ map: "cmsSource", to: "cmsSource", type: "string" }, { map: "batchStatus", to: "batchStatus", type: "string" }],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  searchContent: {
    searchAttributes: [
      { map: "withdrawalDate", to: "keyDates.withdrawalDate", type: "string" },
      { map: "searchable", to: "searchable", type: "boolean" },
      { map: "type", to: "type", type: "string" },
      { map: "subType", to: "subType", type: "string" },
      { map: "product", to: "product.text", type: "string" },
      {
        map: "diseaseState",
        to: "diseaseState",
        type: "string",
        isArray: true
      },
      { map: "audience", to: "audience", type: "string", isArray: true },
      { map: "category", to: "category", type: "string", isArray: true },
      { map: "searchTags", to: "searchTags", type: "string", isArray: true },
      { map: "deliveryType", to: "deliveryType", type: "string" },
      {
        map: "deliverySubType",
        to: "deliverySubType",
        type: "string",
        isArray: true
      },
      { map: "title", to: "title", type: "string" },
      { map: "format", to: "format", type: "string" },
      { map: "poweredBy", to: "poweredBy", type: "string" },
      { map: "taxonomy", to: "taxonomy", type: "string", isArray: true },
      { map: "static", to: "static", type: "string" },
      { map: "branding", to: "branding", type: "string", isArray: true }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  searchContentOrCondition: {
    searchAttributes: [
      {
        map: "inlineText",
        to: "inlineText",
        type: "string",
        condition: "NotEquals"
      },
      { map: "s3Url", to: "s3Url", type: "string", condition: "NotEquals" }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  getBatchDetails: {
    searchAttributes: [{ map: "cmsSource", to: "cmsSource", type: "string" }, { map: "batchStatus", to: "batchStatus", type: "string" }],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  fetchDownloadRecords: {
    searchAttributes: [{ map: "errorStatus", to: "errorStatus", type: "boolean" }, { map: "s3Url", to: "s3Url", type: "string" }],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  siteSpecificConsent: {
    searchAttributes: [
      { map: "static", to: "static", type: "boolean" },
      { map: "site", to: "site", type: "number" },
      { map: "category", to: "category", type: "string", isArray: true },
      { map: "siteExpiryDate", to: "siteExpiryDate", type: "string" },
      { map: "siteActivationDate", to: "siteActivationDate", type: "string" },
      { map: "s3Url", to: "s3Url", type: "string", condition: "NotEquals" }
    ],
    acceptedAttributes: [{ map: "studyCode", type: "string" }],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  getContentById: {
    acceptedAttributes: [{ map: "userId", type: "string" }, { map: "articleId", type: "string" }],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  allergyintolerance: {
    searchAttributes: [
      { map: "patient", to: "patient" },
      { map: "onset", to: "onset", type: "date", isMultiple: true },
      {
        map: "lastUpdated",
        to: "meta.lastUpdated",
        type: "date",
        isMultiple: true
      },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
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
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  procedure: {
    searchAttributes: [
      { map: "patient", to: "subject" },
      {
        map: "date",
        to: "performedDateTime",
        type: "date",
        isPeriod: true,
        isMultiple: true,
        condition: " and ",
        periodAttribute: ["performedPeriod"]
      },
      {
        map: "lastUpdated",
        to: "meta.lastUpdated",
        type: "date",
        isMultiple: true
      },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
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
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  device: {
    searchAttributes: [
      { map: "id", to: "id", type: "string" },
      { map: "identifier", to: "identifier[*].value", type: "array" },
      { map: "informationSource", to: "informationSource.reference", type: "string" },
      { map: "platformToken", to: "platformToken.value", type: "string" },
      { map: "status", to: "status", type: "string" },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "clientRequestId", to: "meta.clientRequestId", type: "string", isMultiple: true },
      { map: "limit", type: "number" },
      { map: "offset", type: "number" }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  notification: {
    allAttributes: [
      "id",
      "resourceType",
      "identifier",
      "category",
      "to",
      "from",
      "source",
      "channels",
      "viewedDateTime",
      "sourceAttachment",
      "message",
      "activity",
      "meta"
    ],
    searchAttributes: [
      { map: "id", to: "id", type: "string" },
      { map: "to", to: "to.reference", type: "string" },
      { map: "from", to: "from.reference", type: "string" },
      { map: "channels", to: "channels[*]", type: "array", isMultiple: true },
      { map: "source", to: "source.value", type: "string", isMultiple: true },
      { map: "category", to: "category", type: "string", isMultiple: true },
      { map: "created", to: "message.created", type: "date", isMultiple: true },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "clientRequestId", to: "meta.clientRequestId", type: "string", isMultiple: true },
      { map: "limit", type: "number" },
      { map: "offset", type: "number" }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  },
  appointment: {
    searchAttributes: [
      { map: "actor", to: "participant[*].actorReference.reference", type: "array" },
      { map: "informationSource", to: "informationSource.reference", type: "string" },
      { map: "appointmentType", to: "appointmentType.coding[*].code", type: "array" },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "date", to: "start", type: "date", isMultiple: true },
      { map: "reasonCode", to: "reasonCode[*].coding[*].code", type: "array" },
      { map: "serviceCategory", to: "serviceCategory[*].coding[*].code", type: "array" },
      { map: "serviceType", to: "serviceType[*].coding[*].code", type: "array" },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "clientRequestId", to: "meta.clientRequestId", type: "string", isMultiple: true },
      { map: "limit", type: "number" },
      { map: "offset", type: "number" }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["*"],
      "care partner": ["*"]
    }
  }
};

export { data, settings };
