import type { Request, RequestHandler, Response } from 'express';

/** Adapts an async controller method to Express, forwarding rejections to the error handler. */
export const handle =
  (action: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    action(req, res).catch(next);
  };
