// Prints the winning plan of every query the repositories run, so reviewers can confirm index usage.
// Uses a throwaway "<db>_explain" database filled with sample data, then drops it.
import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { Bootstrapper } from '../../bootstrap/Bootstrapper';
import { container } from '../container';
import { AppConfig } from '../config/AppConfig';
import { Database } from '../database/Database';
import { Migrator } from '../database/Migrator';
import { userSearchFilter } from '../repositories/mongo/MongoUserRepository';
import { CategoryModel } from '../domain/Category';
import { NoteModel } from '../domain/Note';
import { PermissionModel } from '../domain/Permission';
import { RoleModel } from '../domain/Role';
import { RolePermissionModel } from '../domain/RolePermission';
import { TagModel } from '../domain/Tag';
import { UserModel } from '../domain/User';
import { UserCategoryModel } from '../domain/UserCategory';
import { UserTagModel } from '../domain/UserTag';
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
    if (key === 'rejectedPlans' || key === 'allPlansExecution') continue; // only the winning plan
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
  const words = ['budget', 'meeting', 'recipe', 'travel', 'workout'];
  const categories = await CategoryModel.insertMany(words.map((name) => ({ name })));
  const tags = await TagModel.insertMany(words.map((name) => ({ name })));
  const notes = await NoteModel.insertMany(
    users.flatMap((u, n) =>
      Array.from({ length: 5 }, (_, i) => ({
        user_id: u._id,
        title: `n${i} ${words[(n + i) % words.length]}`,
        content: `about ${words[(n + i + 1) % words.length]}`,
        isArchived: i % 4 === 0,
        archivedAt: i % 4 === 0 ? new Date(Date.now() - (n * 5 + i) * 1000) : null,
        pinned_at: i === 1 ? new Date(Date.now() - n * 1000) : null,
        category_id: categories[i % words.length]!._id,
        tag_ids: [tags[(n + i) % words.length]!._id],
      })),
    ),
  );
  const count = <K extends string>(key: K, pick: (note: (typeof notes)[number]) => unknown[]) => {
    const counts = new Map<string, { user_id: unknown; id: unknown; noteCount: number }>();
    for (const note of notes) {
      for (const id of pick(note)) {
        const k = `${note.user_id}:${id}`;
        counts.set(k, { user_id: note.user_id, id, noteCount: (counts.get(k)?.noteCount ?? 0) + 1 });
      }
    }
    return [...counts.values()].map(({ user_id, id, noteCount }) => ({ user_id, [key]: id, noteCount }));
  };
  await UserCategoryModel.insertMany(count('category_id', (note) => [note.category_id]));
  await UserTagModel.insertMany(count('tag_id', (note) => note.tag_ids));
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
    await report('user search ?q=user 1 (name or email)', UserModel.find(userSearchFilter('user 1')).sort({ name: 1, _id: 1 }).limit(limit).explain(stats));
    await report('user search count', UserModel.collection.aggregate([{ $match: userSearchFilter('user 1') }, { $count: 'n' }]).explain(stats));
    await report('role still assigned?: users.exists({role_id})', UserModel.findOne({ role_id: user.role_id }).select('_id').explain(stats));
    await report('my notes: find({user_id}).sort(pinned, _id desc)', NoteModel.find({ user_id: user._id }).sort({ pinned_at: -1, _id: -1 }).limit(limit).explain(stats));
    await report(
      'my notes count: countDocuments({user_id})',
      NoteModel.collection.aggregate([{ $match: { user_id: user._id } }, { $count: 'n' }]).explain(stats),
    );
    await report('all notes: sort _id desc', NoteModel.find().sort({ _id: -1 }).limit(limit).explain(stats));
    const mine = { user_id: user._id };
    await report('my notes: sort pinned, updatedAt desc', NoteModel.find(mine).sort({ pinned_at: -1, updatedAt: -1 }).limit(limit).explain(stats));
    await report('my notes: sort pinned, oldest first', NoteModel.find(mine).sort({ pinned_at: -1, _id: 1 }).limit(limit).explain(stats));
    await report('all notes: sort updatedAt desc', NoteModel.find().sort({ updatedAt: -1 }).limit(limit).explain(stats));
    const category = await CategoryModel.findOne({ name: 'budget' }).orFail();
    const tag = await TagModel.findOne({ name: 'meeting' }).orFail();
    await report('my notes (default: not archived)', NoteModel.find({ ...mine, isArchived: false }).sort({ pinned_at: -1, _id: -1 }).limit(limit).explain(stats));
    await report('my notes: ?isArchived=true', NoteModel.find({ ...mine, isArchived: true }).sort({ pinned_at: -1, _id: -1 }).limit(limit).explain(stats));
    await report('archive: sort archivedAt desc', NoteModel.find({ ...mine, isArchived: true }).sort({ archivedAt: -1, _id: -1 }).limit(limit).explain(stats));
    await report('archive count', NoteModel.collection.aggregate([{ $match: { ...mine, isArchived: true } }, { $count: 'n' }]).explain(stats));
    await report('my notes: ?category_id', NoteModel.find({ ...mine, category_id: category._id }).sort({ pinned_at: -1, _id: -1 }).limit(limit).explain(stats));
    await report('my notes: ?category_id count', NoteModel.collection.aggregate([{ $match: { ...mine, category_id: category._id } }, { $count: 'n' }]).explain(stats));
    await report('my notes: ?tag_id', NoteModel.find({ ...mine, tag_ids: tag._id }).sort({ pinned_at: -1, _id: -1 }).limit(limit).explain(stats));
    await report('categories list: sort name', CategoryModel.find().sort({ name: 1 }).limit(limit).explain(stats));
    await report('tags list: sort name', TagModel.find().sort({ name: 1 }).limit(limit).explain(stats));
    await report('my categories: user_categories', UserCategoryModel.aggregate([{ $match: mine }, { $lookup: { from: 'categories', localField: 'category_id', foreignField: '_id', as: 'c' } }]).explain(stats));
    await report('my tags: user_tags', UserTagModel.aggregate([{ $match: mine }, { $lookup: { from: 'tags', localField: 'tag_id', foreignField: '_id', as: 't' } }]).explain(stats));
    await report('category counter: user_categories key', UserCategoryModel.findOne({ ...mine, category_id: category._id }).explain(stats));
    await report('my notes: search ?q=meeting', NoteModel.find({ ...mine, $text: { $search: 'meeting' } }).sort({ pinned_at: -1, _id: -1 }).limit(limit).explain(stats));
    await report('all notes: search ?q=meeting', NoteModel.find({ $text: { $search: 'meeting' } }).sort({ _id: -1 }).limit(limit).explain(stats));
    await report('all notes: ?isArchived count (hint _id)', NoteModel.collection.aggregate([{ $match: { isArchived: true } }, { $count: 'n' }], { hint: { _id: 1 } }).explain(stats));
    await report('GET note: findOne({_id, user_id})', NoteModel.findOne({ _id: note._id, user_id: user._id }).explain(stats));
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
  } finally {
    await database.drop();
    await database.disconnect();
  }
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
