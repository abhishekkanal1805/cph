/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as _ from "lodash";
import { Op } from "sequelize";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { ResourceCategory } from "../../common/constants/resourceCategory";
import { DeleteCriteriaRequestParams, DeleteObjectParams, DeleteRequestParams } from "../../common/interfaces/baseInterfaces";
import { BadRequestResult, ForbiddenResult } from "../../common/objects/custom-errors";
import { InternalServerErrorResult } from "../../common/objects/custom-errors";
import { tableNameToResourceTypeMapping } from "../../common/objects/tableNameToResourceTypeMapping";
import { DAOService } from "../dao/daoService";
import { AuthService } from "../security/authService";
import { DataFetch } from "../utilities/dataFetch";
import { DataTransform } from "../utilities/dataTransform";
import { JsonParser } from "../utilities/jsonParser";
import { SharingRulesHelper } from "../utilities/sharingRulesHelper";
import { BaseGet } from "./baseGet";

export class BaseDelete {
  /**
   *  Deletes the id for provided Model from database
   *  A get is first performed to make the record exists in database and also to make sure the access by requestor is authorized.
   *  For Definitional resources access validations are not performed.
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requesterProfileId requestorProfileId Id of logged in user
   * @param patientElement Element name that will be used for validating against the requesterProfileId
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @param permanent true or "true" for parmanent delete. false or "false" for soft delete
   * @returns
   * @memberof BaseDelete
   */
  public static async deleteResource(id: string, model: any, modelDataResource: any, requestParams: DeleteRequestParams) {
    log.info("Entering BaseDelete :: deleteResource()");
    const queryObject = { id, [Constants.META_IS_DELETED_KEY]: false };
    const options = { where: queryObject };
    let record = await DAOService.fetchOne(model, options);
    record = record.dataResource;
    const ownerIds = JsonParser.findValuesForKey([record], requestParams.ownerElement, false);
    const serviceName: string = tableNameToResourceTypeMapping[model.getTableName()];
    const connection = await AuthService.authorizeConnectionBasedSharingRules({
      requester: requestParams.requestorProfileId,
      ownerReference: ownerIds[0],
      resourceType: serviceName,
      accessType: Constants.ACCESS_EDIT,
      resourceAction: requestParams.resourceAction
    });
    // For system user/ loggedin user to get his own record we won't add sharing rules
    if (connection.length > 0) {
      const whereClause = SharingRulesHelper.addSharingRuleClause(queryObject, connection[0], model, Constants.ACCESS_EDIT);
      if (_.isEmpty(whereClause[Op.and])) {
        log.error("Sharing rules not present for requested user :: deleteResource()");
        throw new ForbiddenResult(errorCodeMap.Forbidden.value, errorCodeMap.Forbidden.description);
      }
      record = await DAOService.fetchOne(model, { where: whereClause });
      record = record.dataResource;
    }
    const deleteOptions: DeleteObjectParams = {
      permanent: requestParams.permanent,
      requestLogRef: requestParams.requestLogRef,
      requestorProfileId: requestParams.requestorProfileId
    };
    await BaseDelete.deleteObject(record, model, modelDataResource, deleteOptions);
    log.info("Exiting BaseDelete :: deleteResource()");
  }

  /**
   * @deprecated use deleteResource instead.
   * Variation of the deleteResource where access authorization checks are not performed before performing delete.
   * A get is first performed to make the record exists in database.
   *
   * @param id
   * @param model
   * @param modelDataResource
   * @param permanent
   * @returns {Promise<void>}
   */
  public static async deleteResourceWithoutAuthorization(id, model, modelDataResource, requestParams: DeleteRequestParams) {
    log.info("In BaseDelete :: deleteResourceWithoutAuthorization()");
    // getResource will always return the record. if nothing found it throws NotFound error.
    const record = await BaseGet.getResourceWithoutAuthorization(id, model);
    await BaseDelete.deleteObject(record, model, modelDataResource, requestParams);
  }

  /**
   * Deletes the provided object from database.
   * A GET is not performed for to make sure the object state is current or whether this exists in DB.
   * No access authorization checks are not performed before performing delete.
   *
   * @param record Existing record that needs to be deleted. Should be provided as instance of the Sequelize Object to be deleted.
   * @param model class for
   * @param modelDataResource
   * @param permanent true or "true" for parmanent delete. false or "false" for soft delete
   * @returns {Promise<void>}
   */
  public static async deleteObject(record, model, modelDataResource, requestParams: DeleteObjectParams) {
    log.info("Entering BaseDelete :: deleteObject()");
    if (requestParams.permanent === true || requestParams.permanent === "true") {
      log.info("Permanently deleting the item" + record.id);
      await DAOService.delete(record.id, model);
    } else if (requestParams.permanent === false || requestParams.permanent === "false") {
      log.info("Soft deleting the item" + record.id);
      record.meta.isDeleted = true;
      record.meta.lastUpdated = new Date().toISOString();
      if (requestParams.requestLogRef) {
        record.meta.requestLogRef = requestParams.requestLogRef;
      }
      if (requestParams.requestorProfileId) {
        record.meta.lastUpdatedBy = requestParams.requestorProfileId;
      }
      record = DataTransform.convertToModel(record, model, modelDataResource);
      await DAOService.softDelete(record.id, record, model);
    } else {
      log.info("Invalid parameter value for permanent flag :: deleteObject()");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + Constants.PERMANENT);
    }
    log.info("Exiting BaseDelete :: deleteObject()");
  }

  /**
   *  Wrapper function to perform delete for multiple resources base on provided parameters
   *
   * @static
   * @param {*} requestPayload requestPayload array in JSON format
   * @param {string} patientElement patient reference key like subject.reference
   * @param {*} requestorProfileId requestorProfileId Id of logged in user
   * @param {*} model Model which need to be saved
   * @param {*} modelDataResource Data resource model which can be used for object mapping.
   * @returns
   * @memberof BaseDelete
   */
  public static async deleteResourceWithCriteria(resourcesToBeDeleted, model, modelDataResource, requestParams: DeleteCriteriaRequestParams) {
    /* TODO: endpoint has to be removed from function contract as per new search implementation */
    log.info("Entering BaseDelete :: deleteResources()");
    if (requestParams.permanent === true || requestParams.permanent === "true") {
      log.info("Deleting item Permanently");
      await DAOService.deleteWithCriteria(requestParams.criteria, model);
    } else if (requestParams.permanent === false || requestParams.permanent === "false") {
      for (let eachRecord of resourcesToBeDeleted) {
        log.info("Soft deleting the item" + eachRecord.id);
        eachRecord.meta.isDeleted = true;
        eachRecord.meta.lastUpdated = new Date().toISOString();
        if (requestParams.requestLogRef) {
          eachRecord.meta.requestLogRef = requestParams.requestLogRef;
        }
        if (requestParams.requestorProfileId) {
          eachRecord.meta.lastUpdatedBy = requestParams.requestorProfileId;
        }
        eachRecord = DataTransform.convertToModel(eachRecord, model, modelDataResource);
        await DAOService.softDelete(eachRecord.id, eachRecord, model);
      }
    } else {
      log.info("Invalid parameter value for permanent flag :: deleteResource()");
      throw new BadRequestResult(errorCodeMap.InvalidParameterValue.value, errorCodeMap.InvalidParameterValue.description + Constants.PERMANENT);
    }
    log.info("Exiting BaseDelete :: deleteResources()");
  }
}
