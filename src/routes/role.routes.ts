import { Router } from 'express';
import { container } from 'tsyringe';
import { PermissionKey } from '../common/PermissionKey';
import { PermissionController } from '../controllers/PermissionController';
import { RoleController } from '../controllers/RoleController';
import { CreateRoleDto } from '../dto/role/CreateRoleDto';
import { UpdateRoleDto } from '../dto/role/UpdateRoleDto';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';
import { handle } from './handle';

const { ROLES_MANAGE, USERS_MANAGE } = PermissionKey;

export function roleRoutes(): Router {
  const controller = container.resolve(RoleController);
  const router = Router();
  router.use(container.resolve(AuthenticationMiddleware).handle);

  // users.manage may list roles to pick one for a user.
  router.get('/', authorize(ROLES_MANAGE, USERS_MANAGE), handle((req, res) => controller.list(req, res)));
  router.get('/:id', authorize(ROLES_MANAGE), handle((req, res) => controller.get(req, res)));
  router.post('/', authorize(ROLES_MANAGE), validateBody(CreateRoleDto), handle((req, res) => controller.create(req, res)));
  router.patch(
    '/:id',
    authorize(ROLES_MANAGE),
    validateBody(UpdateRoleDto, { strict: true }),
    handle((req, res) => controller.update(req, res)),
  );
  router.delete('/:id', authorize(ROLES_MANAGE), handle((req, res) => controller.delete(req, res)));
  return router;
}

export function permissionRoutes(): Router {
  const controller = container.resolve(PermissionController);
  const router = Router();
  router.use(container.resolve(AuthenticationMiddleware).handle);
  router.get('/', authorize(ROLES_MANAGE), handle((req, res) => controller.list(req, res)));
  return router;
}
