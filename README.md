# Note Taking App: API

REST API for a note-taking app with JWT auth and role-based access, built for the "Secure Note-Taking
Application" interview task. TypeScript, Express, MongoDB + Mongoose. React client in `../frontend`.

## Run

```bash
cp .env.example .env            # set JWT_SECRET (≥ 32 chars), ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d --build    # MongoDB, API on :3000, app on :8080 (migrates and seeds on start)
npm run explain                 # every query's index plan; flags any COLLSCAN
```

Without Docker: `npm install`, `npm run setup` (migrate and seed), then `npm run dev`.

## Deploy to Vercel

The API runs as one serverless function. `vercel.json` builds with the project's own `tsc` (`npm run vercel-build`)
and routes every request to `api/index.js`, which loads the compiled `src/vercel.ts` handler. The frontend is a
static Vite build. The database is MongoDB Atlas. Use the **Other** framework preset; `vercel.json` sets the rest.

1. **Atlas:** create a free cluster, a database user, and allow network access from `0.0.0.0/0` (Vercel has no fixed IPs).
2. **Seed it once** from your machine: `MONGO_URI="<atlas uri>/secure_notes" npm run setup` (migrations and admin). Repeat after adding a migration.
3. **Backend:** import the backend repo in Vercel. Set every key from `.env.example` as an environment variable: `MONGO_URI` is the Atlas URI, and `MONGO_MAX_POOL_SIZE=5` suits serverless. Set `CORS_ORIGINS` to the frontend URL once you have it.
4. **Frontend:** import the frontend repo and set `VITE_API_URL` to the backend URL.
5. **CORS:** put the frontend URL into the backend's `CORS_ORIGINS` and redeploy the backend.

## Requirements

| Requirement | How |
|---|---|
| User: create, update, delete and list own notes | `/api/notes`, always filtered by the owner |
| Admin: everything a user can do | the `admin` role holds every permission |
| Admin: add, remove, update and list users | `/api/users` |
| Admin: view everyone's notes | `GET /api/notes?all=true` |
| MongoDB + Mongoose, JWT, password hashing | Mongoose models; HS256 JWT (1h); bcrypt cost 12 |
| Pagination on every list | `?page=` and `?limit=` (default 20, max 100) |
| Indexes via `schema.index()` for every list and GET | `src/domain/*.ts`, see [Indexes](#indexes) |
| Scenario 1: users grouped by interests | a single `User.aggregate()` |
| Scenario 2: a user's posts with `$lookup` | a single `User.aggregate()` with `$lookup` |
| No unnecessary indexes | one index per query shape, nothing else |

## Roles and permissions

Roles live in the database, and admins edit them on the Roles screen. Every request reloads the user's
permissions, so a change applies at once.

| Permission | user | admin |
|---|:-:|:-:|
| `notes.manage_own`, `notes.update_own`, `notes.delete_own`: create/list/view, edit, delete own notes | ✓ | ✓ |
| `posts.create`, `posts.update_own`, `posts.delete_own`: write, edit, delete own posts | ✓ | ✓ |
| `notes.read_all`: view everyone's notes | | ✓ |
| `posts.delete_any`: delete anyone's post | | ✓ |
| `users.read`, `users.manage`: list and view users; add, update, deactivate, remove users | | ✓ |
| `roles.manage`: manage roles and permissions | | ✓ |

Someone else's note or post is reported as 404. You can't grant permissions you don't hold, or manage a user
whose role out-ranks yours.

## API

Protected routes need `Authorization: Bearer <token>`. Lists return `{ data, page, limit, total, totalPages }`.
Errors return `{ error, code, permission?, fields? }`.

| Endpoint | Access |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | public, rate limited |
| `GET` / `PATCH /api/auth/me`, `POST /api/auth/me/password` | signed in |
| `GET` / `POST /api/notes`, `GET` / `PATCH` / `DELETE /api/notes/:id` | own notes; `?all=true` / `?user_id=` with `notes.read_all` |
| `GET /api/users`, `GET /api/users/:id` | `users.read` |
| `POST /api/users`, `PATCH` / `DELETE /api/users/:id`, `PATCH /api/users/:id/status` | `users.manage` |
| `GET /api/users/interests` | `users.read`, **Scenario 1** |
| `GET /api/users/:id/posts` | signed in, **Scenario 2** |
| `GET` / `POST /api/posts`, `PATCH` / `DELETE /api/posts/:id` | signed in to read; author to change |
| `/api/roles`, `/api/permissions`, `/api/categories`, `/api/tags` | see the routes in `src/routes/` |

The notes list takes `isArchived` (`false`, `true` or `all`), `category_id`, `tag_id` and `order` (`desc` or
`asc`). Pinned notes come first.

## Indexes

Besides each collection's automatic `_id` index, these are the only indexes:

| Collection | Index | Serves |
|---|---|---|
| users | `{ email: 1 }` unique | sign-in; user search by email prefix |
| users | `{ interests: 1 }` | Scenario 1 |
| users | `{ role_id: 1 }` | "is this role still assigned?" |
| notes | `{ user_id: 1, pinned_at: -1, _id: -1 }` | a user's notes (pinned first, newest first), their count, the `isArchived` / category / tag filters, deleting a user's notes |
| posts | `{ user_id: 1, _id: -1 }` | Scenario 2 `$lookup` and its count; deleting a user's posts |
| roles, permissions | `{ name: 1 }` / `{ key: 1 }` unique | lookups and lists by name / key |
| role_permissions | `{ role_id: 1, permission_id: 1 }` unique | loading a role's permissions on every request |
| categories, tags | `{ name: 1 }` unique | unique names, find-or-create |
| user_categories, user_tags | `{ user_id: 1, <label>_id: 1 }` unique | per-user label counts |

Why nothing more is needed:
- **Built-in `_id` index:**
  - The admin's users and all-notes lists and the posts feed are newest first, which is `_id` order.
  - Every `GET` by id uses it.
- **No `createdAt` indexes:** creation order is `_id` order.
- **No separate filter indexes:** filters are applied to one user's notes, which the `user_id` index already narrows to.

## Aggregations

**Scenario 1** (`GET /api/users/interests`). One `User.aggregate()`:
`$match` / `$sort` on `interests` (uses the index) → `$project` → `$unwind` → `$group` by interest →
`$sort` → `$facet` (page and total in the same call).

**Scenario 2** (`GET /api/users/:id/posts`). One `User.aggregate()`:
`$match { _id }` → `$project` → `$lookup` into posts on `user_id` with `$sort { _id: -1 }`, `$skip`,
`$limit` → a second `$lookup` that counts. Both lookups use `posts { user_id: 1, _id: -1 }`.

Both pipelines are in `src/repositories/aggregations/UserAggregations.ts`.

## Security

- **Passwords:** bcrypt; never returned. The database validator rejects anything but a bcrypt hash.
- **Tokens:** a JWT carries only the user id.
- **Sessions:** a deactivated or removed user, or an expired token, gets 401 on the next request.
- **Hardening:** Helmet, a CORS allow-list (`CORS_ORIGINS`) and a 100 kB body limit.
- **MongoDB connection pool:** sized from `.env` (`MONGO_MAX_POOL_SIZE` and the related timeouts). The API shuts down gracefully on `SIGTERM`.

## Layout

`routes → middleware → controller → service → repository → MongoDB`.
- **Repositories** (`src/repositories/mongo/`) hold every query.
- **Migrations** (`migrations/`, `npm run migrate`) create the collections, validators and indexes.
- **Bootstrap** (`bootstrap/*.json`) seeds the roles, permissions and the admin.
