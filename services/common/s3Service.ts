import * as AWS from "aws-sdk";
import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { InternalServerErrorResult, NotFoundResult } from "../../common/objects/custom-errors";
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
}
