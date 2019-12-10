/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

export interface GetOptions {
  acceptLanguage: string;
}

export interface SearchOptions {
  acceptLanguage: string;
  fetchLimit?: number;
}
export interface RequestParams {
  requestId?: string;
  requestorProfileId: string;
  ownerElement?: string;
  informationSourceElement?: string;
  referenceValidationModel?: any;
  referenceValidationElement?: string;
  ownerType?: string;
}

export interface UpdateRequestParams {
  requestId?: string;
  requestorProfileId: string;
  requestPrimaryIds: string[];
  referenceValidationModel?: any;
  referenceValidationElement?: string;
  uniquesReferenceIds?: any;
  ownerElement?: string;
}

export interface DeleteRequestParams {
  requestorProfileId: string;
  requestId?: string;
  ownerElement?: string;
  permanent: string | boolean;
}

export interface DeleteObjectParams {
  requestorProfileId: string;
  permanent: string | boolean;
  requestId?: string;
}

export interface DeleteCriteriaRequestParams {
  requestorProfileId: string;
  requestId?: string;
  permanent: string | boolean;
  criteria: any;
}
export interface MetaDataElements {
  createdBy: string;
  lastUpdatedBy: string;
  requestId?: string;
}

export interface UpdateMetaDataElements {
  versionId: number;
  created: string;
  createdBy: string;
  lastUpdatedBy: string;
  isDeleted: boolean;
  requestId?: string;
  clientRequestId?: string;
  deviceId?: string;
  source?: string;
}
