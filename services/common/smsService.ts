import * as AWS from "aws-sdk";
import * as log from "lambda-log";

const sns = new AWS.SNS({region: process.env.smsRegion});

export class SmsService {

    /**
     * TODO: code review - this method needs to be async instead of wrapping into promise like this
     * @param {string} phoneNumber
     * @param {string} message
     * @returns {string} returns the messageID saved by SNS as a confirmation
     */
    public static sendMessage(phoneNumber: string, message: string) {
        log.info("Sending SMS");
        const publishInput: any = {
            PhoneNumber: phoneNumber,
            Message: message
        };

        sns.publish(publishInput).promise();
        // sns.publish(publishInput, (err: AWSError, data: SNS.Types.PublishResponse) => {
        //     if (err) {
        //         log.info("Error sending SMS notification. error=" + err);
        //         throw err;
        //     } else if (data) {
        //         log.info("Success sending SMS notification. " + JSON.stringify(data));
        //         return data.MessageId;
        //     }
        // });
    }

}
