/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

export abstract class ErrorResult extends Error {
  public errorLogRef: string;
  public clientRequestId: string;
  public constructor(public errorCode: string, public description: string) {
    super(description);
  }
}

export class BadRequestResult extends ErrorResult {}
export class ForbiddenResult extends ErrorResult {}
export class InternalServerErrorResult extends ErrorResult {}
export class NotFoundResult extends ErrorResult {}
export class UnAuthorizedResult extends ErrorResult {}
export class InsufficientAccountPermissions extends ErrorResult {}
export class SequelizeInitializationError extends ErrorResult {}
export class UnprocessableEntityResult extends ErrorResult {}
export class UnprocessableEntityErrorResult extends ErrorResult {}
export class MultiStatusResult extends ErrorResult {}
