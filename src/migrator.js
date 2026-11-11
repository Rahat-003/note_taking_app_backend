// Minimal migration runner. Each file in migrations/ exports { up(db), down(db) } and runs once,
// in filename order. Applied migrations are recorded in the "migrations" collection with the
// filename as _id, so the built-in _id index is all it needs.
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const DIR = path.join(__dirname, '..', 'migrations');

const files = () => fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).sort();
const nameOf = (file) => path.basename(file, '.js');
const log = () => mongoose.connection.db.collection('migrations');

async function applied() {
  return (await log().find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).toArray()).map((m) => m._id);
}

async function pending() {
  const done = new Set(await applied());
  return files().map(nameOf).filter((name) => !done.has(name));
}

async function migrate() {
  const ran = [];
  for (const name of await pending()) {
    await require(path.join(DIR, name)).up(mongoose.connection.db);
    await log().insertOne({ _id: name, appliedAt: new Date() });
    ran.push(name);
  }
  return ran;
}

// Reverts the most recently applied migration.
async function rollback() {
  const last = (await applied()).pop();
  if (!last) return null;
  await require(path.join(DIR, last)).down(mongoose.connection.db);
  await log().deleteOne({ _id: last });
  return last;
}

module.exports = { applied, pending, migrate, rollback };
