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
  const router = Router();
  router.use(container.resolve(AuthenticationMiddleware).handle);
  // Reading posts: GET /api/users/:id/posts (Scenario 2), open to every signed-in user.
  router.post('/', authorize(PermissionKey.POSTS_CREATE), validateBody(CreatePostDto), handle((req, res) => controller.create(req, res)));
  return router;
}
