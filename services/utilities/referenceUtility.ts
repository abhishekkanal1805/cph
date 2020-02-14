/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

class ReferenceUtility {
  /**
   * Finds references for the provided resource type (this is matched as a prefix) and only returns the unique ones.
   * @param references
   * @param referenceType
   */
  public static getUniqueReferences(references: string[], resourceReferencePrefix: string): string[] {
    return [...new Set(references)].filter(Boolean).filter((reference) => {
      return reference.indexOf(resourceReferencePrefix) > -1;
    });
  }

  /**
   * you can provided ids or references and the function will make sure the returned values are always references.
   * @param idOrReferences
   * @param resourceReferencePrefix
   */
  public static convertToResourceReferences(idOrReferences: string[], resourceReferencePrefix: string): string[] {
    return idOrReferences.map((idOrReference) => {
      return ReferenceUtility.convertToResourceReference(idOrReference, resourceReferencePrefix);
    });
  }

  /**
   * you can provided an id or reference and the function will make sure the returned value is always a reference.
   * @param idOrReference
   * @param resourceReferencePrefix
   */
  public static convertToResourceReference(idOrReference: string, resourceReferencePrefix: string): string {
    return idOrReference.indexOf(resourceReferencePrefix) === -1 ? resourceReferencePrefix + idOrReference : idOrReference;
  }

  /**
   * Makes sure the returned values are all IDs
   * If the provided value is a reference of the expected type, the function will convert it to a resource ID.
   * If the provided value is an ID or a reference but not of the expected type, the function will return it as is.
   * @param idOrReferences
   * @param resourceReferencePrefix
   */
  public static convertToResourceIds(idOrReferences: string[], resourceReferencePrefix: string): string[] {
    return idOrReferences.map((idOrReference) => {
      return ReferenceUtility.convertToResourceId(idOrReference, resourceReferencePrefix);
    });
  }

  /**
   * Makes sure the returned value is an ID
   * If the provided value is a reference of the expected type, the function will convert it to a resource ID.
   * If the provided value is an ID or a reference but not of the expected type, the function will return it as is.
   * @param idOrReference
   * @param resourceReferencePrefix
   */
  public static convertToResourceId(idOrReference: string, resourceReferencePrefix: string): string {
    return idOrReference.indexOf(resourceReferencePrefix) === -1 ? idOrReference : idOrReference.split(resourceReferencePrefix)[1];
  }

  /**
   * If itemsToRemove is not empty we will remove these items from the source. Else the source is returned as is.
   * @param sourceItems
   * @param itemsToRemove
   */
  public static removeReferences(sourceItems: string[], itemsToRemove: string[]) {
    return itemsToRemove && itemsToRemove.length > 0 ? sourceItems.filter((sourceItem) => !itemsToRemove.includes(sourceItem)) : sourceItems;
  }
}

export { ReferenceUtility };
