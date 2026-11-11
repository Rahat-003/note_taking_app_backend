const mongoose = require('mongoose');

// Permission catalog. Keys are defined in bootstrap/permission.json and loaded by `npm run bootstrap`.
const permissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
  },
  { versionKey: false, collection: 'permissions' },
);

// Upsert-by-key on startup, uniqueness, and the catalog list sorted by key.
permissionSchema.index({ key: 1 }, { unique: true });

module.exports = { Permission: mongoose.model('Permission', permissionSchema) };
