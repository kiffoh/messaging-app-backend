export class DomainError extends Error {}
export class BadRequestError extends DomainError {}
export class UnauthorizedError extends DomainError {}
export class ForbiddenError extends DomainError {}
export class NotFoundError extends DomainError {}
export class ConflictError extends DomainError {}
