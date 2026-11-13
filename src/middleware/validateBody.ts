import { type ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { RequestHandler } from 'express';
import { BadRequestException } from '../common/exceptions/BadRequestException';
import { validationException } from './validationErrors';

interface ValidateOptions {
  /** Reject unknown properties instead of silently dropping them (used for updates). */
  strict?: boolean;
}

/** Replaces req.body with a validated, transformed instance of the DTO class. */
export function validateBody<T extends object>(dto: ClassConstructor<T>, { strict = false }: ValidateOptions = {}): RequestHandler {
  return (req, _res, next) => {
    const body: unknown = req.body ?? {};
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return next(new BadRequestException('body: expected a JSON object'));
    }
    const instance = plainToInstance(dto, body);
    validate(instance, { whitelist: true, forbidNonWhitelisted: strict }).then((errors) => {
      if (errors.length) return next(validationException(errors));
      req.body = instance;
      next();
    }, next);
  };
}
