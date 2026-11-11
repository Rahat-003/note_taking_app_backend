const mongoose = require('mongoose');
const { User } = require('./models/User');
const { Note } = require('./models/Note');
const { Post } = require('./models/Post');
const { Role } = require('./models/Role');
const { Permission } = require('./models/Permission');
const { RolePermission } = require('./models/RolePermission');

const models = [User, Note, Post, Role, Permission, RolePermission];

async function connect(uri) {
  // Collections, validators and indexes are created only by migrations (npm run migrate),
  // so Mongoose must not create them implicitly.
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
}

module.exports = { connect, models };
