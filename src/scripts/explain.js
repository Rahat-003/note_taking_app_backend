// Prints the winning plan of every query the API runs, so reviewers can confirm index usage.
// Uses a throwaway "<db>_explain" database filled with sample data, then drops it.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { connect, models } = require('../db');
const { User } = require('../models/User');
const { Note } = require('../models/Note');
const { Post } = require('../models/Post');
const { Role } = require('../models/Role');
const { Permission } = require('../models/Permission');
const { RolePermission } = require('../models/RolePermission');
const { migrate } = require('../migrator');
const { bootstrap } = require('../../bootstrap');
const { usersByInterestPipeline, userPostsPipeline } = require('../aggregations');

const INTERESTS = ['chess', 'reading', 'football', 'cooking', 'music', 'travel', 'coding'];

function collectStages(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => collectStages(n, out));
    return out;
  }
  if (typeof node.stage === 'string') out.push(node.indexName ? `${node.stage}(${node.indexName})` : node.stage);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'rejectedPlans') continue;
    if (key === 'indexesUsed' && Array.isArray(value)) value.forEach((i) => out.push(`$lookup->IXSCAN(${i})`));
    else if (typeof value === 'object') collectStages(value, out);
  }
  return out;
}

async function report(label, explainPromise) {
  const stages = [...new Set(collectStages(await explainPromise))];
  const status = stages.some((s) => s.startsWith('COLLSCAN')) ? 'COLLSCAN!' : 'ok';
  console.log(`${status.padEnd(9)} ${label.padEnd(50)} ${stages.join(' > ')}`);
}

async function fillSampleData() {
  const userRole = await Role.findOne({ name: 'user' });
  const password = await bcrypt.hash('sample', 4); // the users validator only accepts bcrypt hashes
  const users = await User.insertMany(
    Array.from({ length: 300 }, (_, i) => ({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      password,
      role: userRole._id,
      interests: INTERESTS.filter((_, j) => (i + j) % 3 === 0),
    })),
  );
  await Note.insertMany(users.flatMap((u) => Array.from({ length: 5 }, (_, i) => ({ owner: u._id, title: `n${i}` }))));
  await Post.insertMany(users.flatMap((u) => Array.from({ length: 3 }, (_, i) => ({ author: u._id, title: `p${i}`, body: 'b' }))));
  return users[0];
}

async function main() {
  const uri = config.mongoUri.replace(/\/([^/?]+)(\?|$)/, '/$1_explain$2');
  await connect(uri);
  try {
    process.env.ADMIN_PASSWORD ||= 'explain-only-password';
    await migrate();
    await bootstrap();
    const user = await fillSampleData();
    const note = await Note.findOne({ owner: user._id });
    const post = await Post.findOne({ author: user._id });
    const pg = { skip: 0, limit: 20 };
    const q = (query) => query.explain('executionStats');

    console.log('\nIndexes:');
    for (const m of models) {
      const idx = await m.collection.indexes();
      console.log(`  ${m.collection.collectionName.padEnd(16)} ${idx.map((i) => JSON.stringify(i.key)).join('  ')}`);
    }

    console.log('\nQuery plans:');
    await report('login: users.findOne({email})', q(User.findOne({ email: user.email })));
    await report('auth / GET user: users.findById', q(User.findById(user._id)));
    await report('admin list users: sort _id desc', q(User.find().sort({ _id: -1 }).limit(20)));
    await report('role still assigned?: users.exists({role})', q(User.findOne({ role: user.role }).select('_id')));
    await report('my notes: find({owner}).sort(_id desc)', q(Note.find({ owner: user._id }).sort({ _id: -1 }).limit(20)));
    await report('my notes count: countDocuments({owner})', Note.collection.aggregate([{ $match: { owner: user._id } }, { $count: 'n' }]).explain('executionStats'));
    await report('all notes: sort _id desc', q(Note.find().sort({ _id: -1 }).limit(20)));
    await report('GET note: findOne({_id, owner})', q(Note.findOne({ _id: note._id, owner: user._id })));
    await report('posts feed: sort _id desc', q(Post.find().sort({ _id: -1 }).limit(20)));
    await report('GET post: findById', q(Post.findById(post._id)));
    await report('cascade delete posts: {author}', q(Post.find({ author: user._id })));
    await report('permissions list: sort key', q(Permission.find().sort({ key: 1 }).limit(20)));
    await report('role by name', q(Role.findOne({ name: 'user' })));
    await report('roles list: sort name', q(Role.find().sort({ name: 1 }).limit(20)));
    await report('request auth: role_permissions.find({role})', q(RolePermission.find({ role: user.role }, { _id: 0, permission: 1 })));
    await report('Scenario 1: group by interests (all)', User.aggregate(usersByInterestPipeline(pg)).explain('executionStats'));
    await report('Scenario 1: group by interests (?interest=chess)', User.aggregate(usersByInterestPipeline({ interest: 'chess', ...pg })).explain('executionStats'));
    await report('Scenario 2: user posts ($lookup)', User.aggregate(userPostsPipeline({ userId: user._id, ...pg })).explain('executionStats'));
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
