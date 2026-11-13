import cors from 'cors';
import type { RequestHandler } from 'express';

/**
 * CORS for browser clients on other origins. Only listed origins get Access-Control-Allow-Origin;
 * any other origin gets no CORS headers, so the browser blocks the response. Requests without an
 * Origin (same-origin, curl, server-to-server) are unaffected. Auth is a bearer token, not a cookie,
 * so credentials are not allowed.
 */
export function corsMiddleware(allowedOrigins: readonly string[]): RequestHandler {
  const allowAny = allowedOrigins.includes('*');
  return cors({
    origin: (origin, callback) => callback(null, !origin || allowAny || allowedOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After'],
    maxAge: 600, // browsers may cache a preflight for 10 minutes
  });
}
