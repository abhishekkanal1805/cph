import { SES } from "aws-sdk";
import * as log from "lambda-log";

// this is done outside of handler so that we can do it once per Container init rather than on every Lambda invoke
const ses = new SES({ region: process.env.emailRegion });

/**
 * Can be used by anyone to send emails. The service currently uses SES
 */
export class EmailService {
  /**
   * TODO: can we support headers like {"key": "Content-Language","value": "en-US"}
   * Returns SES config object
   * @param {number} code
   * @returns {string}
   */
  public static getSESConfig(sender, recipient, subject, body) {
    return {
      Destination: {
        BccAddresses: [],
        CcAddresses: [],
        ToAddresses: [recipient]
      },
      Message: {
        Body: {
          Html: {
            Data: body,
            Charset: "UTF-8"
          }
        },
        Subject: {
          Data: subject,
          Charset: "UTF-8"
        }
      },
      Source: sender,
      ReplyToAddresses: [sender],
      ReturnPath: sender
    };
  }

  /**
   * TODO: should this method be async instead of wrapping into Promise
   * Send a mail using SES service, using here so the function can auto-wrap the return in Promise
   * @param {any} sesConfig
   * @returns {Promise<string>}
   */
  public static sendMail(sesConfig: any): Promise<any> {
    log.info("Sending mail using SES service");
    return ses.sendEmail(sesConfig).promise();
  }
}
