export abstract class ErrorResult extends Error {
  public constructor(public errorCode: string, public description: string, public errorLogRef) {
    super(description);
  }
}

export class BadRequestResult extends ErrorResult {}
export class ForbiddenResult extends ErrorResult {}
export class InternalServerErrorResult extends ErrorResult {}
export class NotFoundResult extends ErrorResult {}
export class UnAuthorizedResult extends ErrorResult {}
export class GenericError extends ErrorResult {}
export class InsufficientAccountPermissions extends ErrorResult {}
