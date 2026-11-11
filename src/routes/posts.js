const express = require('express');
const { z } = require('zod');
const { Post } = require('../models/Post');
const { authenticate, authorize, can } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { HttpError, toObjectId } = require('../utils/errors');
const { parsePagination, paginated } = require('../utils/pagination');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
});

// Posts are visible to everyone: public, newest first via the _id index.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pg = parsePagination(req.query);
    const [data, total] = await Promise.all([
      Post.find().sort({ _id: -1 }).skip(pg.skip).limit(pg.limit).populate('author', 'name').lean(),
      Post.estimatedDocumentCount(),
    ]);
    res.json(paginated(data, total, pg));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const post = await Post.findById(toObjectId(req.params.id)).populate('author', 'name').lean();
    if (!post) throw new HttpError(404, 'Post not found');
    res.json(post);
  }),
);

router.post(
  '/',
  authenticate,
  authorize('posts.create'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const post = await Post.create({ ...req.body, author: req.user._id });
    res.status(201).json(post);
  }),
);

// Authors can always delete their own posts; posts.delete_any can delete anyone's.
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const filter = { _id: toObjectId(req.params.id) };
    if (!can(req, 'posts.delete_any')) filter.author = req.user._id;
    const { deletedCount } = await Post.deleteOne(filter);
    if (!deletedCount) throw new HttpError(404, 'Post not found');
    res.status(204).end();
  }),
);

module.exports = router;
