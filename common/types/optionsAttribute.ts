export interface GetOptions {
  acceptLanguage: string;
}

export interface SearchOptions {
  acceptLanguage: string;
  fetchLimit?: number;
}

export interface ClinicalSaveOptions {
  referenceValidationModel?: any;
  referenceValidationElement?: string;
  requestId: string;
}

export interface NonClinicalSaveOptions {
  referenceValidationModel?: any;
  referenceValidationElement?: string;
  ownerElement?: string;
  informationSourceElement?: string;
  requestId: string;
}

export interface MetaDataOptions {
  createdBy: string;
  lastUpdatedBy: string;
  requestId: string;
}
