const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    interests: { type: [{ type: String, trim: true, lowercase: true, maxlength: 50 }], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Login lookup + uniqueness guarantee.
userSchema.index({ email: 1 }, { unique: true });
// Multikey index backing the "group users by interests" aggregation.
userSchema.index({ interests: 1 });
// "Is this role still assigned?" check before deleting a role, and the admin bootstrap check.
userSchema.index({ role: 1 });
// Admin user listing and GET by id use the built-in _id index: no extra index.

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = { User: mongoose.model('User', userSchema) };
