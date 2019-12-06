/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as AWS from "aws-sdk";
import * as log from "lambda-log";
import { Constants } from "../../common/constants/constants";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";
const s3 = new AWS.S3({ signatureVersion: "v4" });
AWS.config.sslEnabled = true;

export class S3Service {
  /**
   * Saves objects to AWS S3
   * @param {string} bucket
   * @param {string} key
   * @param {*} file
   * @param {string} contentType
   * @param {string} kmsKeyId
   */
  public static async upload(bucket: string, key: string, file: any, contentType: string, kmsKeyId: string) {
    log.info("Entering s3Service :: upload()");
    const paramsToUploadObject = {
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      ServerSideEncryption: Constants.S3ENCRYPTION,
      SSEKMSKeyId: kmsKeyId
    };
    return s3
      .upload(paramsToUploadObject)
      .promise()
      .then((data) => {
        log.info("Object uploaded to S3 successfully");
        return data;
      })
      .catch((err) => {
        log.error("Error in uploading object to S3 bucket", err);
        throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
      });
  }

  /**
   * returns the requested object for the specified key from s3 bucket.
   * @param {string} bucket
   * @param {string} key
   * @returns {Promise<S3.Body>}
   */
  public static async get(bucket: string, key: string) {
    log.info("Inside S3Service: get()");
    const paramsToGetObject = {
      Bucket: bucket,
      Key: key
    };
    return await s3
      .getObject(paramsToGetObject)
      .promise()
      .then((data) => {
        log.info("Object fetched from  S3 successfully");
        return data;
      })
      .catch((err) => {
        log.error("Error in fetching object from S3 bucket", err);
        throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
      });
  }

  /**
   * Deletes  object for the specified key from s3 bucket.
   * @param {string} bucket
   * @param {string} key
   * @returns {Promise<S3.Body>}
   */
  public static async delete(bucket: string, key: string) {
    log.info("Inside S3Service: delete()");
    const paramsToDeleteObject = {
      Bucket: bucket,
      Key: key
    };
    return await s3
      .deleteObject(paramsToDeleteObject)
      .promise()
      .then((data) => {
        log.info("Object deleted from  S3 successfully");
        return data;
      })
      .catch((err) => {
        log.error("Error in deleting object from S3 bucket", err);
        throw new NotFoundResult(errorCodeMap.NotFound.value, errorCodeMap.NotFound.description);
      });
  }

  /**
   * Generates s3 signed url for requested operation.
   * @param {string} bucket
   * @param {string} key
   * @param {string} expiry
   * @param {string} operation
   * @param {string} kmsKeyId
   * @returns {Promise<S3.Body>}
   */
  public static async getSignedUrl(bucket: string, key: string, expiry: string, operation: string, kmsKeyId?: string) {
    log.info("Inside S3Service:  getSignedUrl()");
    try {
      const expiryTime = parseInt(expiry);
      const params = {
        Bucket: bucket,
        Key: key,
        Expires: expiryTime
      };
      if (operation === Constants.PUT_OBJECT) {
        params["ServerSideEncryption"] = Constants.S3ENCRYPTION;
        if (kmsKeyId) {
          params["SSEKMSKeyId"] = kmsKeyId;
        }
      }
      const url = await s3.getSignedUrl(operation, params);
      log.info("Generated signedUrl successfully");
      return url;
    } catch (err) {
      log.error("Error in generating signed url" + err.stack);
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }
  }
}
