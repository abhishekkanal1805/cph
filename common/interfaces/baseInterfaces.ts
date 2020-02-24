/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

export interface GetOptions {
  acceptLanguage?: string;
  resourceActions?: string[];
  resourceScopeMap?: Map<string, string[]>;
  subjectReferences?: string[];
}

export interface SearchOptions {
  acceptLanguage?: string;
  fetchLimit?: number;
  resourceActions?: string[];
  queryParamToResourceScopeMap?: Map<string, string[]>;
}
export interface RequestParams {
  requestLogRef?: string;
  requestorProfileId: string;
  ownerElement?: string;
  informationSourceElement?: string;
  referenceValidationModel?: any;
  referenceValidationElement?: string;
  ownerType?: string;
  resourceActions?: string[];
  resourceScopeMap?: Map<string, string[]>;
  subjectReferences?: string[];
}

export interface UpdateRequestParams {
  requestLogRef?: string;
  requestorProfileId: string;
  requestPrimaryIds: string[];
  referenceValidationModel?: any;
  referenceValidationElement?: string;
  uniquesReferenceIds?: any;
  ownerElement?: string;
  resourceActions?: string[];
  resourceScopeMap?: Map<string, string[]>;
}

export interface DeleteRequestParams {
  requestorProfileId: string;
  requestLogRef?: string;
  ownerElement?: string;
  permanent: string | boolean;
  resourceActions?: string[];
  resourceScopeMap?: Map<string, string[]>;
  subjectReferences?: string[];
}

export interface DeleteObjectParams {
  requestorProfileId: string;
  permanent: string | boolean;
  requestLogRef?: string;
}

export interface DeleteCriteriaRequestParams {
  requestorProfileId: string;
  requestLogRef?: string;
  permanent: string | boolean;
  criteria: any;
}
export interface MetaDataElements {
  createdBy: string;
  lastUpdatedBy: string;
  requestLogRef?: string;
}

export interface UpdateMetaDataElements {
  versionId: number;
  created: string;
  createdBy: string;
  lastUpdatedBy: string;
  isDeleted: boolean;
  requestLogRef?: string;
  clientRequestId?: string;
  deviceId?: string;
  source?: string;
}
