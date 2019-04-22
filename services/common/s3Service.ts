import * as AWS from "aws-sdk";
import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { InternalServerErrorResult } from "../../common/objects/custom-errors";
const s3 = new AWS.S3();

export class S3Service {
  /**
   * Saves objects to AWS S3
   * @param {string} bucket
   * @param {string} key
   * @param {*} file
   * @param {string} contentType
   */
  public static async upload(bucket: string, key: string, file: any, contentType: string) {
    log.info("Entering s3Service :: upload()");
    const paramsToUploadObject = {
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType
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
   * Generates s3 signed url for requested operation.
   * @param {string} bucket
   * @param {string} key
   * @param {string} expiry
   * @param {string} operation
   * @returns {Promise<S3.Body>}
   */
  public static async getSignedUrl(bucket: string, key: string, expiry: string, operation: string) {
    log.info("Inside S3Service:  getSignedUrl()");
    try {
      const params = {
        Bucket: bucket,
        Key: key,
        Expires: expiry
      };
      const url = await s3.getSignedUrl(operation, params);
      log.info("Generated signedUrl successfully");
      return url;
    } catch (err) {
      log.error("Error in generating signed url");
      throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
    }
  }
}
