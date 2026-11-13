import type { ValidationError } from 'class-validator';
import { BadRequestException } from '../common/exceptions/BadRequestException';
import type { FieldError } from '../common/exceptions/HttpException';

/** Flattens class-validator errors (nested ones as "parent.child") into per-field messages. */
function fieldErrors(errors: ValidationError[], prefix = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = prefix ? `${prefix}.${e.property}` : e.property;
    // class-validator messages start with the property name ("title must be ..."); the field is reported separately.
    const messages = Object.values(e.constraints ?? {}).map((m) => (m.startsWith(`${e.property} `) ? m.slice(e.property.length + 1) : m));
    const own = messages.length ? [{ field, messages }] : [];
    return [...own, ...fieldErrors(e.children ?? [], field)];
  });
}

/** One 400 for every failed field: `error` reads as a sentence, `fields` lists each problem. */
export function validationException(errors: ValidationError[]): BadRequestException {
  const fields = fieldErrors(errors);
  const message = fields.map((f) => `${f.field} ${f.messages.join(', ')}`).join('; ');
  return new BadRequestException(message, fields);
}
