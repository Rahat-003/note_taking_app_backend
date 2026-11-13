import { type ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { RequestHandler } from 'express';
import { validationException } from './validationErrors';

/**
 * Validates the query string against a DTO class and puts the instance on req.validatedQuery.
 * Empty values (?q=) count as absent; unknown parameters are ignored.
 */
export function validateQuery<T extends object>(dto: ClassConstructor<T>): RequestHandler {
  return (req, _res, next) => {
    const present = Object.fromEntries(Object.entries(req.query).filter(([, value]) => value !== ''));
    const instance = plainToInstance(dto, present);
    validate(instance, { whitelist: true }).then((errors) => {
      if (errors.length) return next(validationException(errors));
      req.validatedQuery = instance;
      next();
    }, next);
  };
}
