const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 20000 },
  },
  { timestamps: true, versionKey: false },
);

// $lookup foreignField (author) + newest-first sort inside the lookup pipeline.
// Public post feed and GET by id are served by the built-in _id index.
postSchema.index({ author: 1, _id: -1 });

module.exports = { Post: mongoose.model('Post', postSchema) };
