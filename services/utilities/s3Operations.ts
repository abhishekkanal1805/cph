import * as AWS from "aws-sdk";
import * as log from "lambda-log";
import { errorCodeMap } from "../../common/constants/error-codes-map";
import { InternalServerErrorResult } from "../../common/objects/custom-errors";
const s3 = new AWS.S3();

export class S3Operations {
  /**
   * Saves objects to AWS S3
   * @param {string} bucket
   * @param {string} key
   * @param {*} file
   * @param {string} contentType
   */
  public static async putObject(bucket: string, key: string, file: any, contentType: string) {
    log.info("Entering s3Operations :: putObject()");
    const paramsToPutObject = {
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType
    };
    return s3
      .upload(paramsToPutObject)
      .promise()
      .then((data) => {
        log.info("putObject executed  successfully");
        return data;
      })
      .catch((err) => {
        log.error("Error occoured in putObject", err);
        throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
      });
  }
}
