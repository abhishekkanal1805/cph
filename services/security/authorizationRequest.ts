/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

interface AuthorizationRequest {
  /**
   * UserProfile.id of logged-in User
   */
  requester: string;
  /**
   * Reference of the resource who is submitting the data.
   * This is current only used by the basePost.
   * Example: UserProfile/1111 or ResearchSubject/2222
   */
  informationSourceReference?: string;
  /**
   * Reference of the owner resource
   * Example: UserProfile/1111 or ResearchSubject/2222
   */
  ownerReference: string;
  /**
   * The Sequelize Model name provided by service is converted to service name (also known as resourceType)
   * by looking up the tableNameToResourceTypeMapping
   * TODO: instead of the cph-common mapping these values can we have this sent by the service itself or maybe we can get it from resourceAction?
   */
  resourceType: string;
  /**
   * The base operations will fill this value as either Constants.ACCESS_EDIT Constants.ACCESS_READ.
   * This can be used to drive certain authorizations.
   * TODO: maybe we should be using the resourceAction to determine this.
   */
  accessType: string;
  /**
   * Sent by the respective lambda handler to identify the action a requester is intending to perform.
   */
  resourceActions?: string[];
  /**
   * Optional attribute. If provided will be used to validate that the owner's UserProfile.type attribute is the same value.
   * Possible values are: Constants.SYSTEM_USER, Constants.PATIENT_USER, Constants.CAREPARTNER_USER or Constants.PRACTITIONER_USER
   * Forbidden error is expected to be thrown by AuthService if they dont match.
   * If not provided owner profileType is not checked/enforced.
   */
  ownerType?: string;
}

export { AuthorizationRequest };
