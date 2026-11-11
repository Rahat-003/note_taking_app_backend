const express = require('express');
const { z } = require('zod');
const { Note } = require('../models/Note');
const { authenticate, authorize, can } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { HttpError, toObjectId } = require('../utils/errors');
const { parsePagination, paginated } = require('../utils/pagination');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(authenticate);

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20000).optional(),
});
const updateSchema = createSchema.partial().strict();

// GET /api/notes            -> own notes              (notes.manage_own, { owner: 1, _id: -1 })
// GET /api/notes?owner=<id> -> one user's notes       (notes.read_all,   { owner: 1, _id: -1 })
// GET /api/notes?all=true   -> everyone's notes       (notes.read_all,   _id index)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pg = parsePagination(req.query);
    const crossUser = req.query.all === 'true' || Boolean(req.query.owner);
    if (!can(req, crossUser ? 'notes.read_all' : 'notes.manage_own')) throw new HttpError(403, 'Forbidden');

    let filter = { owner: req.user._id };
    if (req.query.owner) filter = { owner: toObjectId(req.query.owner) };
    else if (req.query.all === 'true') filter = {};

    const [data, total] = await Promise.all([
      Note.find(filter).sort({ _id: -1 }).skip(pg.skip).limit(pg.limit).populate('owner', 'name email').lean(),
      filter.owner ? Note.countDocuments(filter) : Note.estimatedDocumentCount(),
    ]);
    res.json(paginated(data, total, pg));
  }),
);

router.post(
  '/',
  authorize('notes.manage_own'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const note = await Note.create({ ...req.body, owner: req.user._id });
    res.status(201).json(note);
  }),
);

// notes.read_all may read any note; notes.manage_own only their own. Both filters hit the _id index.
router.get(
  '/:id',
  authorize('notes.manage_own', 'notes.read_all'),
  asyncHandler(async (req, res) => {
    const filter = { _id: toObjectId(req.params.id) };
    if (!can(req, 'notes.read_all')) filter.owner = req.user._id;
    const note = await Note.findOne(filter).populate('owner', 'name email').lean();
    if (!note) throw new HttpError(404, 'Note not found');
    res.json(note);
  }),
);

// Writes are limited to the note's owner.
router.patch(
  '/:id',
  authorize('notes.manage_own'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const note = await Note.findOneAndUpdate(
      { _id: toObjectId(req.params.id), owner: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!note) throw new HttpError(404, 'Note not found');
    res.json(note);
  }),
);

router.delete(
  '/:id',
  authorize('notes.manage_own'),
  asyncHandler(async (req, res) => {
    const { deletedCount } = await Note.deleteOne({ _id: toObjectId(req.params.id), owner: req.user._id });
    if (!deletedCount) throw new HttpError(404, 'Note not found');
    res.status(204).end();
  }),
);

module.exports = router;
