const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 20000 },
  },
  { timestamps: true, versionKey: false },
);

// "My notes" list: equality on owner, newest first via _id. Also serves countDocuments({ owner }).
// Admin "all notes" list and GET/PATCH/DELETE by id are served by the built-in _id index.
noteSchema.index({ owner: 1, _id: -1 });

module.exports = { Note: mongoose.model('Note', noteSchema) };
