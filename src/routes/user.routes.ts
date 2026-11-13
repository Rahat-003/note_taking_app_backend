import { Router } from 'express';
import { container } from 'tsyringe';
import { PermissionKey } from '../common/PermissionKey';
import { UserController } from '../controllers/UserController';
import { CreateUserDto } from '../dto/user/CreateUserDto';
import { UpdateUserDto } from '../dto/user/UpdateUserDto';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';
import { handle } from './handle';

export function userRoutes(): Router {
  const controller = container.resolve(UserController);
  const router = Router();
  router.use(container.resolve(AuthenticationMiddleware).handle);

  const { USERS_READ, USERS_MANAGE } = PermissionKey;
  router.get('/interests', authorize(USERS_READ), handle((req, res) => controller.interests(req, res)));
  router.get('/', authorize(USERS_READ, USERS_MANAGE), handle((req, res) => controller.list(req, res)));
  router.post('/', authorize(USERS_MANAGE), validateBody(CreateUserDto), handle((req, res) => controller.create(req, res)));
  router.get('/:id', authorize(USERS_READ, USERS_MANAGE), handle((req, res) => controller.get(req, res)));
  router.patch(
    '/:id',
    authorize(USERS_MANAGE),
    validateBody(UpdateUserDto, { strict: true }),
    handle((req, res) => controller.update(req, res)),
  );
  router.delete('/:id', authorize(USERS_MANAGE), handle((req, res) => controller.delete(req, res)));
  return router;
}
