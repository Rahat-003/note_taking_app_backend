import { Router } from 'express';
import { container } from 'tsyringe';
import { PermissionKey } from '../common/PermissionKey';
import { CategoryController } from '../controllers/CategoryController';
import { TagController } from '../controllers/TagController';
import { CreateCategoryDto } from '../dto/note/CreateCategoryDto';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';
import { handle } from './handle';

const { NOTES_MANAGE_OWN } = PermissionKey;

export function categoryRoutes(): Router {
  const controller = container.resolve(CategoryController);
  const router = Router();
  router.use(container.resolve(AuthenticationMiddleware).handle);
  // Any signed-in user may see the category list (notes.read_all users filter everyone's notes by it).
  router.get('/', handle((req, res) => controller.list(req, res)));
  router.get('/mine', authorize(NOTES_MANAGE_OWN), handle((req, res) => controller.mine(req, res)));
  router.post('/', authorize(NOTES_MANAGE_OWN), validateBody(CreateCategoryDto), handle((req, res) => controller.create(req, res)));
  return router;
}

export function tagRoutes(): Router {
  const controller = container.resolve(TagController);
  const router = Router();
  router.use(container.resolve(AuthenticationMiddleware).handle);
  // Tags are created implicitly when notes are saved with new tag names.
  router.get('/', handle((req, res) => controller.list(req, res)));
  router.get('/mine', authorize(NOTES_MANAGE_OWN), handle((req, res) => controller.mine(req, res)));
  return router;
}
