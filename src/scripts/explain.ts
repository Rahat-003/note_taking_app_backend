// Prints the winning plan of every query the repositories run, so reviewers can confirm index usage.
// Uses a throwaway "<db>_explain" database filled with sample data, then drops it.
import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { Bootstrapper } from '../../bootstrap/Bootstrapper';
import { container } from '../container';
import { AppConfig } from '../config/AppConfig';
import { Database } from '../database/Database';
import { Migrator } from '../database/Migrator';
import { NoteModel } from '../domain/Note';
import { PermissionModel } from '../domain/Permission';
import { PostModel } from '../domain/Post';
import { RoleModel } from '../domain/Role';
import { RolePermissionModel } from '../domain/RolePermission';
import { UserModel } from '../domain/User';
import { UserAggregations } from '../repositories/aggregations/UserAggregations';
import { PERMISSION_KEY_LOOKUP } from '../repositories/mongo/MongoRolePermissionRepository';

const INTERESTS = ['chess', 'reading', 'football', 'cooking', 'music', 'travel', 'coding'];

function collectStages(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => collectStages(n, out));
    return out;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.stage === 'string') out.push(record.indexName ? `${record.stage}(${record.indexName})` : record.stage);
  for (const [key, value] of Object.entries(record)) {
    if (key === 'rejectedPlans') continue;
    if (key === 'indexesUsed' && Array.isArray(value)) value.forEach((i) => out.push(`$lookup->IXSCAN(${i})`));
    else if (typeof value === 'object') collectStages(value, out);
  }
  return out;
}

async function report(label: string, explain: Promise<unknown>): Promise<void> {
  const stages = [...new Set(collectStages(await explain))];
  const status = stages.some((s) => s.startsWith('COLLSCAN')) ? 'COLLSCAN!' : 'ok';
  console.log(`${status.padEnd(9)} ${label.padEnd(50)} ${stages.join(' > ')}`);
}

async function fillSampleData() {
  const userRole = await RoleModel.findOne({ name: 'user' }).orFail();
  const password = await bcrypt.hash('sample', 4); // the users validator only accepts bcrypt hashes
  const users = await UserModel.insertMany(
    Array.from({ length: 300 }, (_, i) => ({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      password,
      role_id: userRole._id,
      interests: INTERESTS.filter((_, j) => (i + j) % 3 === 0),
    })),
  );
  await NoteModel.insertMany(users.flatMap((u) => Array.from({ length: 5 }, (_, i) => ({ user_id: u._id, title: `n${i}` }))));
  await PostModel.insertMany(
    users.flatMap((u) => Array.from({ length: 3 }, (_, i) => ({ user_id: u._id, title: `p${i}`, body: 'b' }))),
  );
  return users[0]!;
}

async function main(): Promise<void> {
  const uri = container.resolve(AppConfig).mongoUri.replace(/\/([^/?]+)(\?|$)/, '/$1_explain$2');
  const database = container.resolve(Database);
  await database.connect(uri);
  try {
    process.env.ADMIN_PASSWORD ||= 'explain-only-password';
    await container.resolve(Migrator).migrate();
    await container.resolve(Bootstrapper).run();

    const user = await fillSampleData();
    const note = await NoteModel.findOne({ user_id: user._id }).orFail();
    const post = await PostModel.findOne({ user_id: user._id }).orFail();
    const [skip, limit] = [0, 20];
    const stats = 'executionStats' as const;

    console.log('\nIndexes:');
    for (const model of Database.models) {
      const indexes = await model.collection.indexes();
      console.log(`  ${model.collection.collectionName.padEnd(16)} ${indexes.map((i) => JSON.stringify(i.key)).join('  ')}`);
    }

    console.log('\nQuery plans:');
    await report('login: users.findOne({email})', UserModel.findOne({ email: user.email }).explain(stats));
    await report('auth / GET user: users.findById', UserModel.findById(user._id).explain(stats));
    await report('admin list users: sort _id desc', UserModel.find().sort({ _id: -1 }).limit(limit).explain(stats));
    await report('role still assigned?: users.exists({role_id})', UserModel.findOne({ role_id: user.role_id }).select('_id').explain(stats));
    await report('my notes: find({user_id}).sort(_id desc)', NoteModel.find({ user_id: user._id }).sort({ _id: -1 }).limit(limit).explain(stats));
    await report(
      'my notes count: countDocuments({user_id})',
      NoteModel.collection.aggregate([{ $match: { user_id: user._id } }, { $count: 'n' }]).explain(stats),
    );
    await report('all notes: sort _id desc', NoteModel.find().sort({ _id: -1 }).limit(limit).explain(stats));
    await report('GET note: findOne({_id, user_id})', NoteModel.findOne({ _id: note._id, user_id: user._id }).explain(stats));
    await report('posts feed: sort _id desc', PostModel.find().sort({ _id: -1 }).limit(limit).explain(stats));
    await report('GET post: findById', PostModel.findById(post._id).explain(stats));
    await report('cascade delete posts: {user_id}', PostModel.find({ user_id: user._id }).explain(stats));
    await report('permissions list: sort key', PermissionModel.find().sort({ key: 1 }).limit(limit).explain(stats));
    await report('role by name', RoleModel.findOne({ name: 'user' }).explain(stats));
    await report('roles list: sort name', RoleModel.find().sort({ name: 1 }).limit(limit).explain(stats));
    await report(
      'request auth: active grants of role -> keys',
      RolePermissionModel.aggregate([{ $match: { role_id: user.role_id, isActive: true } }, ...PERMISSION_KEY_LOOKUP]).explain(stats),
    );
    await report('Scenario 1: group by interests (all)', UserModel.aggregate(UserAggregations.usersByInterest('', skip, limit)).explain(stats));
    await report(
      'Scenario 1: group by interests (?interest=chess)',
      UserModel.aggregate(UserAggregations.usersByInterest('chess', skip, limit)).explain(stats),
    );
    await report('Scenario 2: user posts ($lookup)', UserModel.aggregate(UserAggregations.userPosts(user._id, skip, limit)).explain(stats));
  } finally {
    await database.drop();
    await database.disconnect();
  }
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
