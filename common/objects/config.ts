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
  displayFields: ["informationSource", "subject", "patient", "to", "from", "consentingParty"],
  nonUserDisplayFields: ["device", "medicationPlan"],
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      { map: "medicationPlan", to: "medicationPlan", type: "string", isMultiple: true },
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
    orderBy: ["dt ASC"],

    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      },
      { map: "questionnaire", to: "questionnaire", type: "string", isMultiple: true }
    ],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      }
    ],
    allowedAttempts: 6,
    codeValidDurationDays: 1, // day
    requiredParams: ["inviteeEmail", "inviteeReference", "status"],
    acceptedAttributes: ["id", "inviteeEmail", "invitee", "status", "inviteCode", "inviter", "inviteeReference"],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
    }
  },
  connection: {
    searchAttributes: [
      { map: "from", to: "from.reference", type: "string", isMultiple: true },
      { map: "status", to: "status", type: "string", isMultiple: true },
      { map: "to", to: "to.reference", type: "string", isMultiple: true },
      { map: "type", to: "type", type: "string", isMultiple: true },
      { map: "lastUpdated", to: "meta.lastUpdated", type: "date", isMultiple: true },
      { map: "clientRequestId", to: "meta.clientRequestId", type: "string", isMultiple: true },
      { map: "isDeleted", to: "meta.isDeleted", type: "boolean" },
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
    },
    isUniqueCodeRequired: true
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
  getContentById: {
    acceptedAttributes: [{ map: "userId", type: "string" }, { map: "articleId", type: "string" }],
    endpointAccess: {
      "patient": ["*"],
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
    }
  },
  device: {
    allAttributes: [
      "id",
      "resourceType",
      "identifier",
      "platformToken",
      "status",
      "statusReason",
      "informationSource",
      "manufacturer",
      "manufactureDate",
      "expirationDate",
      "serialNumber",
      "modelNumber",
      "type",
      "deviceName",
      "version",
      "meta"
    ],
    searchAttributes: [
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
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
      "practitioner": ["GET"],
      "care partner": ["GET"]
    }
  }
};

export { data, settings };
