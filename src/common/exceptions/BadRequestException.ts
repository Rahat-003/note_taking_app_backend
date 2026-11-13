import { type FieldError, HttpException } from './HttpException';

export class BadRequestException extends HttpException {
  constructor(message = 'Bad request', fields?: FieldError[]) {
    super(400, message, fields?.length ? { code: 'VALIDATION_FAILED', fields } : { code: 'BAD_REQUEST' });
  }
}
