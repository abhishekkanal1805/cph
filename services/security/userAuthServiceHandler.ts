import { ApiHandler } from "../../common/objects/api-interfaces";
import { LambdaAuthorizerController } from "./lambdaAuthorizer";

const controller: LambdaAuthorizerController = new LambdaAuthorizerController();
export const authorizerFunc: ApiHandler = controller.authorizerFunc;
