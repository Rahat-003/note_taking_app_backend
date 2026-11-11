// Feeds the JSON files in this directory into their collections. Safe to run repeatedly:
//   permission.json -> permissions        upserted by key (descriptions kept in sync)
//   role.json       -> roles              inserted by name if missing
//                   -> role_permissions   "*" always grants every permission; a list is granted
//                                         only when the role is first created, so admin edits stay
//   user.json       -> users              inserted by email if missing; passwords are bcrypt-hashed
// String values may reference env vars as ${NAME}, so secrets stay out of the repo.
const mongoose = require('mongoose');
const { Permission } = require('../src/models/Permission');
const { Role } = require('../src/models/Role');
const { User } = require('../src/models/User');
const { grant } = require('../src/rbac');

const permissions = require('./permission.json');
const roles = require('./role.json');
const users = require('./user.json');

function interpolate(value, file) {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => {
    if (!process.env[name]) throw new Error(`${file}: environment variable ${name} is not set`);
    return process.env[name];
  });
}

async function seedPermissions() {
  await Permission.bulkWrite(
    permissions.map(({ key, description }) => ({
      updateOne: { filter: { key }, update: { $set: { description } }, upsert: true },
    })),
  );
  return permissions.length;
}

async function seedRoles() {
  const allKeys = permissions.map((p) => p.key);
  let created = 0;
  for (const { name, description = '', system = false, permissions: keys } of roles) {
    const res = await Role.updateOne({ name }, { $setOnInsert: { name, description, system } }, { upsert: true });
    const isNew = res.upsertedCount === 1;
    const role = await Role.findOne({ name }, { _id: 1 });
    if (keys === '*') await grant(role._id, allKeys);
    else if (isNew) await grant(role._id, keys);
    created += isNew;
  }
  return created;
}

async function seedUsers() {
  let created = 0;
  for (const entry of users) {
    const { name, email, password, role } = Object.fromEntries(
      Object.entries(entry).map(([k, v]) => [k, typeof v === 'string' ? interpolate(v, 'user.json') : v]),
    );
    if (await User.exists({ email: email.toLowerCase() })) continue;
    const roleDoc = await Role.findOne({ name: role }, { _id: 1 });
    if (!roleDoc) throw new Error(`user.json: role "${role}" for ${email} does not exist`);
    await User.create({ name, email, password, role: roleDoc._id }); // pre-save hook hashes the password
    created += 1;
  }
  return created;
}

async function bootstrap() {
  return {
    permissions: await seedPermissions(),
    roles: await seedRoles(),
    users: await seedUsers(),
  };
}

module.exports = { bootstrap };

if (require.main === module) {
  const config = require('../src/config');
  const { connect } = require('../src/db');
  connect(config.mongoUri)
    .then(bootstrap)
    .then((r) => console.log(`Bootstrap done: ${r.permissions} permissions synced, ${r.roles} roles and ${r.users} users created`))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
