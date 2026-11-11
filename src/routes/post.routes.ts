import { Router } from 'express';
import { container } from 'tsyringe';
import { PermissionKey } from '../common/PermissionKey';
import { PostController } from '../controllers/PostController';
import { CreatePostDto } from '../dto/post/CreatePostDto';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';
import { handle } from './handle';

export function postRoutes(): Router {
  const controller = container.resolve(PostController);
  const authenticate = container.resolve(AuthenticationMiddleware).handle;
  const router = Router();

  // Posts are public to read.
  router.get('/', handle((req, res) => controller.list(req, res)));
  router.get('/:id', handle((req, res) => controller.get(req, res)));
  router.post(
    '/',
    authenticate,
    authorize(PermissionKey.POSTS_CREATE),
    validateBody(CreatePostDto),
    handle((req, res) => controller.create(req, res)),
  );
  // Authors may always delete their own posts; the service checks posts.delete_any for others.
  router.delete('/:id', authenticate, handle((req, res) => controller.delete(req, res)));
  return router;
}
