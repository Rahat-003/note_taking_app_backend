import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { container } from 'tsyringe';
import { AuthController } from '../controllers/AuthController';
import { LoginDto } from '../dto/auth/LoginDto';
import { RegisterDto } from '../dto/auth/RegisterDto';
import { UpdateProfileDto } from '../dto/auth/UpdateProfileDto';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { validateBody } from '../middleware/validateBody';
import { handle } from './handle';

export function authRoutes(): Router {
  const controller = container.resolve(AuthController);
  const authenticate = container.resolve(AuthenticationMiddleware).handle;
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many attempts, try again later' },
  });

  const router = Router();
  router.post('/register', limiter, validateBody(RegisterDto), handle((req, res) => controller.register(req, res)));
  router.post('/login', limiter, validateBody(LoginDto), handle((req, res) => controller.login(req, res)));
  router.get('/me', authenticate, handle((req, res) => controller.me(req, res)));
  router.patch(
    '/me',
    authenticate,
    validateBody(UpdateProfileDto, { strict: true }),
    handle((req, res) => controller.updateMe(req, res)),
  );
  return router;
}
