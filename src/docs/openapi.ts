// OpenAPI 3.0 description of the REST API, served at /api/openapi.json and rendered by Swagger UI at /api/docs.
// Kept next to the routes (src/routes/*.ts) and DTOs (src/dto/**): change them together.
import { PERMISSION_KEYS } from '../common/PermissionKey';

type Schema = Record<string, unknown>;

const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: Schema, description = 'OK') => ({ description, content: { 'application/json': { schema } } });
const body = (schema: Schema, required = true) => ({ required, content: { 'application/json': { schema } } });
const err = (description: string) => json(ref('Error'), description);
const page = (item: string): Schema => ({
  allOf: [ref('PageMeta'), { type: 'object', properties: { data: { type: 'array', items: ref(item) } } }],
});
const idParam = (name = 'id', what = 'Document') => ({
  name, in: 'path', required: true, description: `${what} id (24-character hex ObjectId)`, schema: { type: 'string', example: '665f1c2e9b1e8a3d4c2b1a09' },
});
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];
const errors = {
  400: err('Invalid input (`VALIDATION_FAILED` lists each field) or a malformed id'),
  401: err('Missing, invalid or expired token (`UNAUTHORIZED`, `TOKEN_EXPIRED`) or deactivated account (`ACCOUNT_DISABLED`)'),
  403: err('The role lacks the required permission (`PERMISSION_DENIED`, names the permission)'),
  404: err('Not found, or not yours'),
};
const pick = (...codes: Array<keyof typeof errors>) => Object.fromEntries(codes.map((c) => [c, errors[c]]));
const str = (min: number, max: number, extra: Schema = {}): Schema => ({ type: 'string', minLength: min, maxLength: max, ...extra });
const objectId: Schema = { type: 'string', example: '665f1c2e9b1e8a3d4c2b1a09' };
const date: Schema = { type: 'string', format: 'date-time' };

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Note Taking App API',
    version: '1.0.0',
    description: [
      'REST API with JWT authentication and database-backed role-based access control.',
      '',
      '**Try it:** call `POST /api/auth/login`, copy `token` from the response, click **Authorize** and paste it.',
      '',
      'Every list is paginated (`page`, `limit`) and returns `{ data, page, limit, total, totalPages }`.',
      'Errors return `{ error, code, permission?, fields? }`. Someone else\'s note or post answers 404.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'This server' }],
  tags: [
    { name: 'Auth', description: 'Register, sign in, your profile and password' },
    { name: 'Notes', description: 'Your notes; everyone\'s with `notes.read_all`' },
    { name: 'Posts', description: 'Posts are visible to every signed-in user' },
    { name: 'Users', description: 'User management, Aggregation Scenario 1 and 2' },
    { name: 'Roles', description: 'Roles, permissions and grants (`roles.manage`)' },
    { name: 'Labels', description: 'Note categories and tags' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        required: ['error', 'code'],
        properties: {
          error: { type: 'string', example: 'Note not found' },
          code: { type: 'string', example: 'NOT_FOUND', enum: ['VALIDATION_FAILED', 'BAD_REQUEST', 'UNAUTHORIZED', 'TOKEN_EXPIRED', 'ACCOUNT_DISABLED', 'PERMISSION_DENIED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'RATE_LIMITED', 'INTERNAL', 'UNAVAILABLE'] },
          permission: { type: 'string', example: 'notes.delete_own', description: 'Missing permission (PERMISSION_DENIED)' },
          fields: { type: 'array', items: { type: 'object', properties: { field: { type: 'string', example: 'title' }, messages: { type: 'array', items: { type: 'string', example: 'must be shorter than or equal to 200 characters' } } } } },
        },
      },
      PageMeta: {
        type: 'object',
        properties: { page: { type: 'integer', example: 1 }, limit: { type: 'integer', example: 20 }, total: { type: 'integer', example: 42 }, totalPages: { type: 'integer', example: 3 } },
      },
      UserSummary: { type: 'object', properties: { _id: objectId, name: { type: 'string', example: 'Rahat' }, email: { type: 'string', example: 'rahat@example.com' } } },
      User: {
        type: 'object',
        properties: {
          _id: objectId, name: { type: 'string' }, email: { type: 'string', format: 'email' }, bio: { type: 'string' },
          interests: { type: 'array', items: { type: 'string' }, example: ['chess', 'reading'] },
          isActive: { type: 'boolean' }, role_id: objectId,
          role: { type: 'object', nullable: true, properties: { _id: objectId, name: { type: 'string', example: 'user' } } },
          createdAt: date, updatedAt: date,
        },
      },
      Session: {
        type: 'object',
        properties: { user: ref('User'), permissions: { type: 'array', items: { type: 'string', enum: PERMISSION_KEYS }, example: ['notes.manage_own', 'posts.create'] } },
      },
      AuthResult: { allOf: [ref('Session'), { type: 'object', properties: { token: { type: 'string', description: 'JWT; send as `Authorization: Bearer <token>`' } } }] },
      Label: { type: 'object', properties: { _id: objectId, name: { type: 'string', example: 'work' } } },
      Note: {
        type: 'object',
        properties: {
          _id: objectId, user_id: objectId, title: { type: 'string' }, content: { type: 'string' },
          isArchived: { type: 'boolean' }, pinned_at: { ...date, nullable: true, description: 'Set when pinned; pinned notes come first' },
          category_id: objectId, tag_ids: { type: 'array', items: objectId },
          user: { allOf: [ref('UserSummary')], nullable: true }, category: { allOf: [ref('Label')], nullable: true }, tags: { type: 'array', items: ref('Label') },
          createdAt: date, updatedAt: date,
        },
      },
      NoteInput: {
        type: 'object',
        properties: {
          title: str(1, 200, { example: 'Groceries' }), content: { type: 'string', maxLength: 20000, example: 'Milk, eggs' },
          isArchived: { type: 'boolean' }, pinned: { type: 'boolean', description: 'true pins (the server records pinned_at), false unpins' },
          category_id: { type: 'string', description: 'categories._id; "" removes the category (update only)' },
          tags: { type: 'array', maxItems: 20, items: str(1, 30), description: 'Tag names; new ones are created', example: ['home'] },
        },
      },
      Post: {
        type: 'object',
        properties: { _id: objectId, user_id: objectId, title: { type: 'string' }, body: { type: 'string' }, user: { type: 'object', nullable: true, properties: { _id: objectId, name: { type: 'string' } } }, createdAt: date, updatedAt: date },
      },
      PostSummary: { type: 'object', properties: { _id: objectId, title: { type: 'string' }, body: { type: 'string' }, createdAt: date, updatedAt: date } },
      InterestGroup: {
        type: 'object',
        properties: { interest: { type: 'string', example: 'chess' }, count: { type: 'integer', example: 2 }, users: { type: 'array', items: ref('UserSummary') } },
      },
      Grant: { type: 'object', properties: { permission_id: objectId, key: { type: 'string', example: 'notes.manage_own' }, isActive: { type: 'boolean' } } },
      Role: {
        type: 'object',
        properties: {
          _id: objectId, name: { type: 'string', example: 'user' }, description: { type: 'string' }, system: { type: 'boolean', description: 'admin / user: cannot be renamed or deleted' },
          permissions: { type: 'array', items: { type: 'string' }, description: 'Active permission keys' }, grants: { type: 'array', items: ref('Grant') },
        },
      },
      Permission: { type: 'object', properties: { _id: objectId, key: { type: 'string', example: 'notes.read_all' }, description: { type: 'string' } } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Create an account (gets the user role)', security: [],
        requestBody: body({ type: 'object', required: ['name', 'email', 'password'], properties: { name: str(1, 100, { example: 'Rahat' }), email: { type: 'string', format: 'email', example: 'rahat@example.com' }, password: str(8, 72, { example: 'Password@1' }) } }),
        responses: { 201: json(ref('AuthResult'), 'Created; signed in'), 400: errors[400], 409: err('Email already in use'), 429: err('Too many attempts') },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Sign in and get a JWT', security: [],
        requestBody: body({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }),
        responses: { 200: json(ref('AuthResult')), 400: errors[400], 401: err('Wrong email or password, or deactivated account'), 429: err('Too many attempts') },
      },
    },
    '/api/auth/me': {
      get: { tags: ['Auth'], summary: 'Your profile and permissions', responses: { 200: json(ref('Session')), ...pick(401) } },
      patch: {
        tags: ['Auth'], summary: 'Update your profile',
        requestBody: body({ type: 'object', properties: { name: str(1, 100), bio: { type: 'string', maxLength: 500 }, interests: { type: 'array', maxItems: 20, items: str(1, 50), example: ['chess', 'reading'] } } }),
        responses: { 200: json(ref('Session')), ...pick(400, 401) },
      },
    },
    '/api/auth/me/password': {
      post: {
        tags: ['Auth'], summary: 'Change your password',
        requestBody: body({ type: 'object', required: ['currentPassword', 'newPassword', 'confirmPassword'], properties: { currentPassword: { type: 'string' }, newPassword: str(8, 72), confirmPassword: { type: 'string', description: 'Must equal newPassword' } } }),
        responses: { 204: { description: 'Changed' }, ...pick(400, 401), 429: err('Too many attempts') },
      },
    },
    '/api/notes': {
      get: {
        tags: ['Notes'], summary: 'List notes (yours by default; pinned first)',
        description: 'Index: `{ user_id: 1, pinned_at: -1, _id: -1 }` for one user\'s notes; the `_id` index for `all=true`.',
        parameters: [
          ...pageParams,
          { name: 'all', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'Everyone\'s notes (`notes.read_all`)' },
          { name: 'user_id', in: 'query', schema: { type: 'string' }, description: 'One user\'s notes (`notes.read_all`)' },
          { name: 'isArchived', in: 'query', schema: { type: 'string', enum: ['false', 'true', 'all'], default: 'false' } },
          { name: 'category_id', in: 'query', schema: { type: 'string' } },
          { name: 'tag_id', in: 'query', schema: { type: 'string' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['desc', 'asc'], default: 'desc' }, description: 'By created date' },
        ],
        responses: { 200: json(page('Note')), ...pick(400, 401, 403) },
      },
      post: { tags: ['Notes'], summary: 'Create a note (notes.manage_own)', requestBody: body({ allOf: [ref('NoteInput'), { required: ['title'] }] }), responses: { 201: json(ref('Note'), 'Created'), ...pick(400, 401, 403, 404) } },
    },
    '/api/notes/{id}': {
      parameters: [idParam('id', 'Note')],
      get: { tags: ['Notes'], summary: 'Get a note (yours; any with notes.read_all)', responses: { 200: json(ref('Note')), ...pick(400, 401, 403, 404) } },
      patch: { tags: ['Notes'], summary: 'Update your note: edit, pin, archive (notes.update_own)', requestBody: body(ref('NoteInput')), responses: { 200: json(ref('Note')), ...pick(400, 401, 403, 404) } },
      delete: { tags: ['Notes'], summary: 'Delete your note (notes.delete_own)', responses: { 204: { description: 'Deleted' }, ...pick(400, 401, 403, 404) } },
    },
    '/api/posts': {
      get: { tags: ['Posts'], summary: 'Everyone\'s posts, newest first', description: 'Index: the built-in `_id` index.', parameters: pageParams, responses: { 200: json(page('Post')), ...pick(401) } },
      post: {
        tags: ['Posts'], summary: 'Write a post (posts.create)',
        requestBody: body({ type: 'object', required: ['title', 'body'], properties: { title: str(1, 200, { example: 'Hello' }), body: str(1, 20000, { example: 'My first post' }) } }),
        responses: { 201: json(ref('Post'), 'Created'), ...pick(400, 401, 403) },
      },
    },
    '/api/posts/{id}': {
      parameters: [idParam('id', 'Post')],
      patch: {
        tags: ['Posts'], summary: 'Edit your post (posts.update_own)',
        requestBody: body({ type: 'object', properties: { title: str(1, 200), body: str(1, 20000) } }),
        responses: { 200: json(ref('Post')), ...pick(400, 401, 403, 404) },
      },
      delete: { tags: ['Posts'], summary: 'Delete your post (posts.delete_own), or any post (posts.delete_any)', responses: { 204: { description: 'Deleted' }, ...pick(400, 401, 403, 404) } },
    },
    '/api/users': {
      get: {
        tags: ['Users'], summary: 'List users, newest first (users.read)',
        parameters: [...pageParams, { name: 'q', in: 'query', schema: { type: 'string', maxLength: 100 }, description: 'Email prefix search (uses `{ email: 1 }`)' }],
        responses: { 200: json(page('User')), ...pick(401, 403) },
      },
      post: {
        tags: ['Users'], summary: 'Add a user (users.manage)',
        requestBody: body({ type: 'object', required: ['name', 'email', 'password'], properties: { name: str(1, 100), email: { type: 'string', format: 'email' }, password: str(8, 72), role_id: { type: 'string', description: 'Defaults to the `user` role' }, interests: { type: 'array', items: str(1, 50) } } }),
        responses: { 201: json(ref('User'), 'Created'), ...pick(400, 401, 403), 409: err('Email already in use') },
      },
    },
    '/api/users/interests': {
      get: {
        tags: ['Users'], summary: 'Aggregation Scenario 1: users grouped by interest (users.read)',
        description: 'One `User.aggregate()` call: `$match`/`$sort` on the `{ interests: 1 }` index → `$project` → `$unwind` → `$group` → `$sort` → `$facet` (page and total).',
        parameters: [...pageParams, { name: 'interest', in: 'query', schema: { type: 'string' }, description: 'Only this interest' }],
        responses: { 200: json(page('InterestGroup')), ...pick(401, 403) },
      },
    },
    '/api/users/{id}': {
      parameters: [idParam('id', 'User')],
      get: { tags: ['Users'], summary: 'Get a user (users.read)', responses: { 200: json(ref('User')), ...pick(400, 401, 403, 404) } },
      patch: {
        tags: ['Users'], summary: 'Update a user (users.manage; not yourself)',
        requestBody: body({ type: 'object', properties: { name: str(1, 100), email: { type: 'string', format: 'email' }, password: str(8, 72), role_id: { type: 'string' }, interests: { type: 'array', items: str(1, 50) } } }),
        responses: { 200: json(ref('User')), ...pick(400, 401, 403, 404) },
      },
      delete: { tags: ['Users'], summary: 'Remove a user with their notes and posts (users.manage; not yourself)', responses: { 204: { description: 'Removed' }, ...pick(400, 401, 403, 404) } },
    },
    '/api/users/{id}/status': {
      parameters: [idParam('id', 'User')],
      patch: {
        tags: ['Users'], summary: 'Activate or deactivate a user (users.manage)', description: 'A deactivated user gets 401 `ACCOUNT_DISABLED` on their next request and cannot sign in.',
        requestBody: body({ type: 'object', required: ['isActive'], properties: { isActive: { type: 'boolean' } } }),
        responses: { 200: json(ref('User')), ...pick(400, 401, 403, 404) },
      },
    },
    '/api/users/{id}/posts': {
      parameters: [idParam('id', 'User')],
      get: {
        tags: ['Users'], summary: 'Aggregation Scenario 2: one user\'s posts via $lookup',
        description: 'One `User.aggregate()` pipeline: `$match { _id }` → `$project` → `$lookup` into posts (`$sort`, `$skip`, `$limit`) → `$lookup` count. Both lookups use `posts { user_id: 1, _id: -1 }`.',
        parameters: pageParams,
        responses: { 200: json({ allOf: [page('PostSummary'), { type: 'object', properties: { user: ref('UserSummary') } }] }), ...pick(400, 401, 404) },
      },
    },
    '/api/roles': {
      get: { tags: ['Roles'], summary: 'List roles with their grants (roles.manage or users.manage)', parameters: pageParams, responses: { 200: json(page('Role')), ...pick(401, 403) } },
      post: {
        tags: ['Roles'], summary: 'Create a role (roles.manage)',
        requestBody: body({ type: 'object', required: ['name', 'permissions'], properties: { name: str(1, 50, { pattern: '^[a-z0-9_-]+$', example: 'moderator' }), description: { type: 'string', maxLength: 200 }, permissions: { type: 'array', items: { type: 'string', enum: PERMISSION_KEYS } } } }),
        responses: { 201: json(ref('Role'), 'Created'), ...pick(400, 401, 403), 409: err('Name already in use') },
      },
    },
    '/api/roles/{id}': {
      parameters: [idParam('id', 'Role')],
      get: { tags: ['Roles'], summary: 'Get a role (roles.manage)', responses: { 200: json(ref('Role')), ...pick(400, 401, 403, 404) } },
      patch: {
        tags: ['Roles'], summary: 'Update a role (roles.manage)', description: '`permissions` replaces the granted set; existing grants keep their isActive. The admin role cannot be edited.',
        requestBody: body({ type: 'object', properties: { name: str(1, 50, { pattern: '^[a-z0-9_-]+$' }), description: { type: 'string', maxLength: 200 }, permissions: { type: 'array', items: { type: 'string', enum: PERMISSION_KEYS } } } }),
        responses: { 200: json(ref('Role')), ...pick(400, 401, 403, 404) },
      },
      delete: { tags: ['Roles'], summary: 'Delete a custom role that no user has (roles.manage)', responses: { 204: { description: 'Deleted' }, ...pick(400, 401, 403, 404) } },
    },
    '/api/roles/{id}/permissions/{permission_id}': {
      parameters: [idParam('id', 'Role'), idParam('permission_id', 'Permission')],
      patch: {
        tags: ['Roles'], summary: 'Switch one grant on or off (roles.manage)',
        requestBody: body({ type: 'object', required: ['isActive'], properties: { isActive: { type: 'boolean' } } }),
        responses: { 200: json(ref('Role')), ...pick(400, 401, 403, 404) },
      },
    },
    '/api/permissions': {
      get: { tags: ['Roles'], summary: 'The permission catalog (roles.manage)', parameters: pageParams, responses: { 200: json(page('Permission')), ...pick(401, 403) } },
    },
    '/api/categories': {
      get: { tags: ['Labels'], summary: 'All categories, by name', parameters: pageParams, responses: { 200: json(page('Label')), ...pick(401) } },
      post: {
        tags: ['Labels'], summary: 'Create a category (notes.manage_own); returns the existing one if the name is taken',
        requestBody: body({ type: 'object', required: ['name'], properties: { name: str(1, 50, { example: 'work' }) } }),
        responses: { 201: json(ref('Label'), 'Created'), 200: json(ref('Label'), 'Already existed'), ...pick(400, 401, 403) },
      },
    },
    '/api/categories/mine': {
      get: { tags: ['Labels'], summary: 'Categories your notes use, with counts (notes.manage_own)', parameters: pageParams, responses: { 200: json(page('Label')), ...pick(401, 403) } },
    },
    '/api/tags': {
      get: { tags: ['Labels'], summary: 'All tags, by name', parameters: pageParams, responses: { 200: json(page('Label')), ...pick(401) } },
    },
    '/api/tags/mine': {
      get: { tags: ['Labels'], summary: 'Tags your notes use, with counts (notes.manage_own)', parameters: pageParams, responses: { 200: json(page('Label')), ...pick(401, 403) } },
    },
  },
} as const;
