import * as AWS from "aws-sdk";
import * as jwt from "jsonwebtoken";
import * as jwkToPem from "jwk-to-pem";
import * as log from "lambda-log";
import * as request from "request-promise";
import { ApiCallback, ApiContext } from "../../common/objects/api-interfaces";
import * as config from "../../common/objects/config";

// read allowed pools from config
const allowedPools = config.data.allowedPools.map((d) => {
  return "https://cognito-idp." + d.region + ".amazonaws.com/" + d.poolId;
});

export class LambdaAuthorizerController {
  public static async getProfile(token: any, region: string) {
    const cognito = new AWS.CognitoIdentityServiceProvider({ region });
    const profileInfo: any = {};
    return await cognito
      .getUser({ AccessToken: token })
      .promise()
      .then((data) => {
        log.info("Data received from cognito");
        for (const item of data.UserAttributes) {
          profileInfo[item.Name] = item.Value;
        }
        return profileInfo;
      })
      .catch((err) => {
        log.error("Error in fetching users from cognito", err);
        throw new Error("Error in fetching users from cognito");
      });
  }

  public static generatePolicy(principalId: string, effect: string, resource: string, context?: any): any {
    const authResponse: any = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
      const policyDocument: any = {};
      policyDocument.Version = "2012-10-17";
      policyDocument.Statement = [];
      const statementOne: any = {};
      statementOne.Action = "execute-api:Invoke";
      statementOne.Effect = effect;
      statementOne.Resource = resource;
      policyDocument.Statement[0] = statementOne;
      authResponse.policyDocument = policyDocument;
    }
    if (context) {
      authResponse.context = context;
    }
    return authResponse;
  }

  public static async verifyAndGetPolicy(event, token, pem, iss, profileInfo) {
    return jwt.verify(token, pem, { issuer: iss }, (err, payload) => {
      if (err) {
        log.error("Error occured during token verfication with pool");
        throw new Error("Unable to verify token with pool");
      } else {
        const principalId = payload.sub;
        const apiOptions: any = {};
        const tmp = event.methodArn.split(":");
        const apiGatewayArnTmp = tmp[5].split("/");
        apiOptions.region = tmp[3];
        apiOptions.restApiId = apiGatewayArnTmp[0];
        apiOptions.stage = apiGatewayArnTmp[1];
        // set Allow/Deny for permission
        return LambdaAuthorizerController.generatePolicy(principalId, "Allow", event.methodArn, profileInfo);
      }
    });
  }

  public static async getPEMFile(iss, pems) {
    await request({
      url: iss + "/.well-known/jwks.json",
      json: true
    })
      .then((response) => {
        const keys = response["keys"];
        for (const each of keys) {
          const keyId = each.kid;
          const modulus = each.n;
          const exponent = each.e;
          const keyType = each.kty;
          const jwk = { kty: keyType, n: modulus, e: exponent };
          const pem = jwkToPem(jwk);
          pems[keyId] = pem;
        }
      })
      .catch((err) => {
        log.error("Unable to download JWKs", err.message);
        throw new Error("Unable to download JWKs");
      });
  }

  public async authorizerFunc(event: any, context: ApiContext, callback: ApiCallback) {
    const pems = {};
    // TODO: Get this default value from config file. And in either case line115 will always override this values so do we need the default.
    let region = "us-east-1";
    try {
      const token = event.authorizationToken;
      const decodedJwt = jwt.decode(token, { complete: true });
      if (!decodedJwt) {
        log.error("Not a valid JWT token");
        context.fail("Unauthorized");
      }
      // Reject the jwt if it's not an Access Token
      if (decodedJwt.payload.token_use !== "access") {
        log.error("Not an access token");
        context.fail("Unauthorized");
      }
      const iss = decodedJwt.payload.iss;
      // If token is not from our trusted pool then reject
      const poolIdx = allowedPools.indexOf(iss);
      if (poolIdx === -1) {
        log.error("Not an access token/ Id token");
        context.fail("Unauthorized");
      } else {
        region = config.data.allowedPools[poolIdx].region;
      }
      if (Object.keys(pems).length < 1) {
        await LambdaAuthorizerController.getPEMFile(iss, pems);
      }
      const kid = decodedJwt.header.kid;
      if (!pems[kid]) {
        log.error("Invalid access token");
        context.fail("Unauthorized");
      }
      const profileInfo = await LambdaAuthorizerController.getProfile(token, region);
      const policy = await LambdaAuthorizerController.verifyAndGetPolicy(event, token, pems[kid], iss, profileInfo);
      context.succeed(policy);
    } catch (err) {
      log.error("Error occured during token validation", err.stackTrace);
      context.fail("Unauthorized");
    }
  }
}
