export interface GetOptions {
  acceptLanguage: string;
}

export interface SearchOptions {
  acceptLanguage: string;
  fetchLimit?: number;
}
export interface PostOptions {
  requestId: string;
  requestorProfileId: string;
  referenceValidationModel?: any;
  referenceValidationElement?: string;
}

export interface ClinicalSaveOptions extends PostOptions {
  patientElement: string;
  informationSourceElement: string;
}

export interface NonClinicalSaveOptions extends PostOptions {
  ownerElement?: string;
  informationSourceElement?: string;
}

export interface MetaDataOptions {
  createdBy: string;
  lastUpdatedBy: string;
  requestId: string;
}
