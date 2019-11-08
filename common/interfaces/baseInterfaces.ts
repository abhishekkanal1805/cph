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

export interface MetaDataElements {
  createdBy: string;
  lastUpdatedBy: string;
  requestId?: string;
}
