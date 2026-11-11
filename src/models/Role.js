const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, lowercase: true, maxlength: 50 },
    description: { type: String, default: '', maxlength: 200 },
    // System roles ("admin", "user") cannot be deleted; "admin" permissions cannot be edited.
    system: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, collection: 'roles' },
);

// Lookup by name (default role at registration, bootstrap), uniqueness, and the role list sorted by name.
roleSchema.index({ name: 1 }, { unique: true });

module.exports = { Role: mongoose.model('Role', roleSchema) };
