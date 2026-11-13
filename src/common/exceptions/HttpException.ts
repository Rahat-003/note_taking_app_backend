/** A field that failed validation, with its messages (without the field name). */
export interface FieldError {
  field: string;
  messages: string[];
}

/** Extra, machine-readable parts of an error response (besides `error`, the human-readable message). */
export interface ErrorDetails {
  /** Stable code the client can switch on, e.g. VALIDATION_FAILED, PERMISSION_DENIED. */
  code?: string;
  /** The permission that was missing (403 PERMISSION_DENIED). */
  permission?: string;
  /** Per-field problems (400 VALIDATION_FAILED, 409 on a duplicate value). */
  fields?: FieldError[];
}

export class HttpException extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: ErrorDetails = {},
  ) {
    super(message);
    this.name = new.target.name;
  }
}
