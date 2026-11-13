import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { type ErrorDetails, HttpException } from '../common/exceptions/HttpException';

interface MongoLikeError {
  code?: number;
  keyValue?: Record<string, unknown>;
  type?: string;
}

const CODES: Record<number, string> = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT' };

const withoutCode = ({ code: _code, ...rest }: ErrorDetails): Omit<ErrorDetails, 'code'> => rest;

/** Every error is { error: message, code, permission?, fields? }. */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof HttpException) {
    res.status(err.status).json({ error: err.message, code: err.details.code ?? CODES[err.status] ?? 'ERROR', ...withoutCode(err.details) });
    return;
  }
  const e = (err ?? {}) as MongoLikeError;
  if (e.code === 11000) {
    const field = Object.keys(e.keyValue ?? {})[0] ?? 'value';
    res.status(409).json({ error: `That ${field} is already in use`, code: 'CONFLICT', fields: [{ field, messages: ['is already in use'] }] });
  } else if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.values(err.errors).map((e) => ({ field: e.path, messages: [e.message] }));
    res.status(400).json({ error: err.message, code: 'VALIDATION_FAILED', fields });
  } else if (e.code === 121) {
    res.status(400).json({ error: 'Document failed database validation', code: 'VALIDATION_FAILED' });
  } else if (e.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Malformed JSON', code: 'BAD_REQUEST' });
  } else if (e.type === 'entity.too.large') {
    res.status(413).json({ error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' });
  } else {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
  }
};
