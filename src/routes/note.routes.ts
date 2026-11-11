import { Router } from 'express';
import { container } from 'tsyringe';
import { PermissionKey } from '../common/PermissionKey';
import { NoteController } from '../controllers/NoteController';
import { CreateNoteDto } from '../dto/note/CreateNoteDto';
import { NoteQueryDto } from '../dto/note/NoteQueryDto';
import { UpdateNoteDto } from '../dto/note/UpdateNoteDto';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';
import { validateQuery } from '../middleware/validateQuery';
import { handle } from './handle';

export function noteRoutes(): Router {
  const controller = container.resolve(NoteController);
  const router = Router();
  router.use(container.resolve(AuthenticationMiddleware).handle);

  // The list checks notes.manage_own or notes.read_all itself, depending on ?all / ?user_id.
  router.get('/', validateQuery(NoteQueryDto), handle((req, res) => controller.list(req, res)));
  router.post(
    '/',
    authorize(PermissionKey.NOTES_MANAGE_OWN),
    validateBody(CreateNoteDto),
    handle((req, res) => controller.create(req, res)),
  );
  router.get(
    '/:id',
    authorize(PermissionKey.NOTES_MANAGE_OWN, PermissionKey.NOTES_READ_ALL),
    handle((req, res) => controller.get(req, res)),
  );
  router.patch(
    '/:id',
    authorize(PermissionKey.NOTES_MANAGE_OWN),
    validateBody(UpdateNoteDto, { strict: true }),
    handle((req, res) => controller.update(req, res)),
  );
  router.delete('/:id', authorize(PermissionKey.NOTES_MANAGE_OWN), handle((req, res) => controller.delete(req, res)));
  return router;
}
