import * as AWS from "aws-sdk";
import * as log from "lambda-log";
import { errorCode } from "../../common/constants/error-codes";
import { BadRequestResult } from "../../common/objects/custom-errors";
import { Utility } from "./Utility";

// this is done outside of handler so that we can do it once per Container init rather than on every Lambda invoke

/**
 * Service to send push notification to specific devices. The service currently uses SNS
 */
export class PushService {
  /**
   * returns end point
   * @returns {Promise<void>}
   */
  public static createPlatformEndpoint(sns, platformApplicationArn, deviceId, userId, callback) {
    let endpoint;

    const params = {
      PlatformApplicationArn: platformApplicationArn,
      Token: deviceId,
      CustomUserData: userId
    };

    sns.createPlatformEndpoint(params, (err, data) => {
      if (err) {
        const response = String(err);
        const beginFrom = "Token Reason: Endpoint ";
        const endTo = " already exists";
        try {
          endpoint = response.match(new RegExp(beginFrom + "(.*)" + endTo))[1];
          if (endpoint.length == 0) {
            return null;
          }
        } catch (error) {
          log.error(String(err).split(/\r|\n/)[0]);
        }
      }
      if (data) {
        callback(data.EndpointArn);
        return data.EndpointArn;
      } else {
        callback(endpoint);
        return endpoint;
      }
    });
  }

  public static deleteEndpoint(sns, endPoint) {
    const params = {
      EndpointArn: endPoint
    };
    sns.deleteEndpoint(params, (err, data) => {
      if (err) {
        log.error(String(err).split(/\r|\n/)[0]);
        return null;
      } else {
        log.log(data);
      }
    });
  }

  public static getApplePayload(message, category, action) {
    const payload = {
      default: message,
      APNS: {
        aps: {
          "alert": message,
          "sound": "default",
          "badge": "1",
          "category": category,
          "mutable-content": "1",
          "url": action
        }
      }
    };
    // have to stringify the entire message payload
    const msg = JSON.stringify(payload);
    return msg;
  }

  /**
   *
   * @param sns
   * @param message
   * @param endpointArn
   * @param successCallback
   * @returns {Promise<void>}
   */
  public static publishMessage(sns, message, endpointArn, callback) {
    const payload = {
      Message: message,
      MessageStructure: "json",
      TargetArn: endpointArn
    };

    try {
      sns.publish(payload, (pushErr, pushData) => {
        if (pushErr) {
          callback(pushErr);
        }
        callback(pushData);
      });
    } catch (err) {
      // callback(err);
    }
  }

  /**
   *
   * @param userid
   * @param message
   * @returns {Promise<void>}
   *  process.env.platformApplicationArn,
   */
  // --------------------------------------------------
  public static pushMessage(platformApplicationARN, deviceTokens, userId, message, action, category, pushCallback) {
    log.info("Inside PushService: pushNotification()");
    const sns = new AWS.SNS();

    for (const deviceToken of deviceTokens) {
      this.createPlatformEndpoint(sns, platformApplicationARN, deviceToken, userId, (endpointArn) => {
        // checking endpointArn for errors
        if (typeof endpointArn === "undefined") {
          throw new BadRequestResult(errorCode.InvalidRequest, "Invalid platform endpoint");
        }

        // TODO add a check for the push platform, this cannot be assumed to be apple push
        const payload = this.getApplePayload(message, category, action);

        // check payload for errors
        if (!Utility.safeParse(payload)) {
          log.debug("Error in payload: " + payload);
          throw new BadRequestResult(errorCode.InvalidRequest, "Invalid message payload is generated for publishing");
        }

        this.publishMessage(sns, payload, endpointArn, (callback) => {
          try {
            if (callback.statusCode == 400) {
              log.debug("Endpoint Error : " + callback.message + " for deviceToken: " + deviceToken);
              this.deleteEndpoint(sns, endpointArn);
            } else {
              log.info("sent message to device " + deviceToken);
              pushCallback(callback);
            }
          } catch (err) {
            log.debug("Endpoint Error : " + callback.message + " for deviceToken: " + deviceToken);
          }
        });
      });
    }
  }
}
