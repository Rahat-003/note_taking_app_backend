import { Router } from 'express';
import { container } from 'tsyringe';
import { PermissionKey } from '../common/PermissionKey';
import { PostController } from '../controllers/PostController';
import { CreatePostDto } from '../dto/post/CreatePostDto';
import { UpdatePostDto } from '../dto/post/UpdatePostDto';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';
import { handle } from './handle';

export function postRoutes(): Router {
  const controller = container.resolve(PostController);
  const router = Router();
  router.use(container.resolve(AuthenticationMiddleware).handle);
  // Posts are visible to everyone signed in: the feed here, one user's posts at GET /api/users/:id/posts (Scenario 2).
  router.get('/', handle((req, res) => controller.list(req, res)));
  router.post('/', authorize(PermissionKey.POSTS_CREATE), validateBody(CreatePostDto), handle((req, res) => controller.create(req, res)));
  // Editing: authors only (someone else's post answers 404). Deleting: the author, or posts.delete_any for any
  // post. An admin can switch each permission on or off per role.
  router.patch(
    '/:id',
    authorize(PermissionKey.POSTS_UPDATE_OWN),
    validateBody(UpdatePostDto, { strict: true }),
    handle((req, res) => controller.update(req, res)),
  );
  router.delete('/:id', authorize(PermissionKey.POSTS_DELETE_OWN, PermissionKey.POSTS_DELETE_ANY), handle((req, res) => controller.delete(req, res)));
  return router;
}
