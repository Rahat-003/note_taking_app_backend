import express, { type Express } from 'express';
import helmet from 'helmet';
import { container } from 'tsyringe';
import { NotFoundException } from './common/exceptions/NotFoundException';
import { AppConfig } from './config/AppConfig';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth.routes';
import { categoryRoutes, tagRoutes } from './routes/label.routes';
import { noteRoutes } from './routes/note.routes';
import { postRoutes } from './routes/post.routes';
import { permissionRoutes, roleRoutes } from './routes/role.routes';
import { userRoutes } from './routes/user.routes';

/** Builds the Express app. The DI container (./container) must be imported first. */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Behind Vercel's proxy the client IP is in X-Forwarded-For; trust that one hop so the rate limiter
  // counts real clients (and express-rate-limit doesn't reject the header).
  if (process.env.VERCEL) app.set('trust proxy', 1);
  app.use(helmet());
  // Before the routes, so preflight (OPTIONS) requests are answered here.
  app.use(corsMiddleware(container.resolve(AppConfig).corsOrigins));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/auth', authRoutes());
  app.use('/api/notes', noteRoutes());
  app.use('/api/categories', categoryRoutes());
  app.use('/api/tags', tagRoutes());
  app.use('/api/users', userRoutes());
  app.use('/api/posts', postRoutes());
  app.use('/api/roles', roleRoutes());
  app.use('/api/permissions', permissionRoutes());

  app.use((_req, _res, next) => next(new NotFoundException()));
  app.use(errorHandler);

  return app;
}
