// Creates every collection with a $jsonSchema validator, then builds the indexes declared with
// schema.index() in src/models. Re-running on existing collections only re-applies the validators.
const { User } = require('../src/models/User');
const { Note } = require('../src/models/Note');
const { Post } = require('../src/models/Post');
const { Role } = require('../src/models/Role');
const { Permission } = require('../src/models/Permission');
const { RolePermission } = require('../src/models/RolePermission');

const str = (maxLength, minLength = 0) => ({ bsonType: 'string', minLength, maxLength });
const objectId = { bsonType: 'objectId' };
const date = { bsonType: 'date' };

const collections = [
  {
    model: User,
    schema: {
      required: ['name', 'email', 'password', 'role'],
      properties: {
        name: str(100, 1),
        email: str(254, 3),
        // Only bcrypt hashes may be stored, never a plaintext password.
        password: { bsonType: 'string', pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$' },
        role: objectId,
        interests: { bsonType: 'array', items: str(50, 1) },
        createdAt: date,
        updatedAt: date,
      },
    },
  },
  {
    model: Note,
    schema: {
      required: ['owner', 'title'],
      properties: { owner: objectId, title: str(200, 1), content: str(20000), createdAt: date, updatedAt: date },
    },
  },
  {
    model: Post,
    schema: {
      required: ['author', 'title', 'body'],
      properties: { author: objectId, title: str(200, 1), body: str(20000, 1), createdAt: date, updatedAt: date },
    },
  },
  {
    model: Role,
    schema: {
      required: ['name', 'system'],
      properties: { name: str(50, 1), description: str(200), system: { bsonType: 'bool' }, createdAt: date, updatedAt: date },
    },
  },
  {
    model: Permission,
    schema: {
      required: ['key'],
      properties: { key: str(100, 1), description: str(200) },
    },
  },
  {
    model: RolePermission,
    schema: {
      required: ['role', 'permission'],
      properties: { role: objectId, permission: str(100, 1) },
    },
  },
];

async function up(db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const { model, schema } of collections) {
    const name = model.collection.collectionName;
    const options = { validator: { $jsonSchema: { bsonType: 'object', ...schema } }, validationLevel: 'strict', validationAction: 'error' };
    if (existing.has(name)) await db.command({ collMod: name, ...options });
    else await db.createCollection(name, options);
    await model.syncIndexes();
  }
}

async function down(db) {
  for (const { model } of collections) await db.collection(model.collection.collectionName).drop().catch(() => {});
}

module.exports = { up, down };
