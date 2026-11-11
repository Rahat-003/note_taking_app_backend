import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../common/Tokens';
import type { CreateNoteDto } from '../dto/note/CreateNoteDto';
import type { UpdateNoteDto } from '../dto/note/UpdateNoteDto';
import type { NoteService } from '../services/NoteService';
import { BaseController } from './BaseController';

@injectable()
export class NoteController extends BaseController {
  constructor(@inject(Tokens.NoteService) private readonly notes: NoteService) {
    super();
  }

  /** GET /api/notes (own), ?user_id=<id> (one user's) or ?all=true (everyone's). */
  async list(req: Request, res: Response): Promise<void> {
    const query = { all: req.query.all === 'true', user_id: req.query.user_id };
    res.json(await this.notes.list(this.principal(req), query, this.pageRequest(req)));
  }

  async get(req: Request, res: Response): Promise<void> {
    res.json(await this.notes.get(this.principal(req), this.param(req, 'id')));
  }

  async create(req: Request, res: Response): Promise<void> {
    res.status(201).json(await this.notes.create(this.principal(req), this.body<CreateNoteDto>(req)));
  }

  async update(req: Request, res: Response): Promise<void> {
    res.json(await this.notes.update(this.principal(req), this.param(req, 'id'), this.body<UpdateNoteDto>(req)));
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.notes.delete(this.principal(req), this.param(req, 'id'));
    res.status(204).end();
  }
}
