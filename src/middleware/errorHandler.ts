import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { HttpException } from '../common/exceptions/HttpException';

interface MongoLikeError {
  code?: number;
  keyValue?: Record<string, unknown>;
  type?: string;
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof HttpException) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const e = (err ?? {}) as MongoLikeError;
  if (e.code === 11000) {
    const field = Object.keys(e.keyValue ?? {})[0] ?? 'value';
    res.status(409).json({ error: `That ${field} is already in use` });
  } else if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: err.message });
  } else if (e.code === 121) {
    res.status(400).json({ error: 'Document failed database validation' });
  } else if (e.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Malformed JSON' });
  } else if (e.type === 'entity.too.large') {
    res.status(413).json({ error: 'Payload too large' });
  } else {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
