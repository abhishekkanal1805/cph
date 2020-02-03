/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

export interface GetOptions {
  acceptLanguage?: string;
  resourceAction?: string;
}

export interface SearchOptions {
  acceptLanguage?: string;
  fetchLimit?: number;
}
export interface RequestParams {
  requestLogRef?: string;
  requestorProfileId: string;
  ownerElement?: string;
  informationSourceElement?: string;
  referenceValidationModel?: any;
  referenceValidationElement?: string;
  ownerType?: string;
  resourceAction?: string;
}

export interface UpdateRequestParams {
  requestLogRef?: string;
  requestorProfileId: string;
  requestPrimaryIds: string[];
  referenceValidationModel?: any;
  referenceValidationElement?: string;
  uniquesReferenceIds?: any;
  ownerElement?: string;
  resourceAction?: string;
}

export interface DeleteRequestParams {
  requestorProfileId: string;
  requestLogRef?: string;
  ownerElement?: string;
  permanent: string | boolean;
  resourceAction?: string;
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
