# Note Taking App: requirements coverage

This file maps each point of the technical interview task ("Secure Note-Taking Application") to where and
how this backend implements it. For setup, the full API reference and the frontend, see the project's root
`README.md`.

**Status legend:** ✅ done · ⚠️ done differently from the task text · ❌ not implemented

| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | REST API + functional frontend | ✅ | `src/` (Express API), `../frontend` (React client) |
| 2 | User: create, update, delete, list **own** notes | ✅ | `src/routes/note.routes.ts`, `src/services/impl/NoteServiceImpl.ts` |
| 2 | Admin: everything a user can do | ✅ | `admin` role always holds every permission (`bootstrap/role.json`) |
| 2 | Admin: add, update, list users | ✅ | `src/routes/user.routes.ts` |
| 2 | Admin: **remove** users | ⚠️ | users are **deactivated**, not deleted (see [Known gaps](#known-gaps)) |
| 2 | Admin: view everyone's notes | ✅ | `GET /api/notes?all=true` (`notes.read_all`) |
| 3 | MongoDB with Mongoose | ✅ | `src/domain/*.ts` |
| 3 | JWT authentication | ✅ | `src/services/impl/TokenServiceImpl.ts` |
| 3 | Secure password hashing | ✅ | bcrypt, cost 12, `src/domain/User.ts` |
| 4 | Indexes declared with `schema.index()` | ✅ | every index is in `src/domain/*.ts` |
| 4A | Pagination on every list | ✅ | `src/common/pagination/` |
| 4A | Indexes for every list view | ✅ | [Indexes](#4-indexes) |
| 4A | Indexes for every GET | ✅ | [Indexes](#4-indexes) |
| 4B | Scenario 1: users grouped by interests, one `aggregate()` | ✅ | `src/repositories/aggregations/UserAggregations.ts` |
| 4B | Scenario 2: a user's posts with `$lookup` | ✅ | `src/repositories/aggregations/UserAggregations.ts` |
| 5 | No unnecessary indexes | ✅ / ⚠️ | [Indexes](#4-indexes): one index per query shape; four serve features beyond the task |

## Run and verify

```bash
cp .env.example .env        # set JWT_SECRET (≥ 32 chars), ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d --build   # MongoDB + API (:3000) + React app (:8080); migrates and seeds first
npm run explain             # prints every query's winning plan and flags any COLLSCAN
```

`npm run explain` builds a throwaway database with sample data and shows that every query in the
repositories uses an index.

## MongoDB connection pool

The API process keeps one MongoDB connection pool (`src/config/AppConfig.ts` → `mongoose.connect`). All values
can be overridden by environment variables; docker-compose passes them through.

| Setting (env var) | Default | Why |
|---|---|---|
| `maxPoolSize` (`MONGO_MAX_POOL_SIZE`) | 20 | a request uses up to 3 connections at once (auth lookup, then a list and its count in parallel), so about 7 concurrent requests per instance before queuing |
| `minPoolSize` (`MONGO_MIN_POOL_SIZE`) | 2 | keeps a couple of connections warm, so the first request after idle skips the TCP/handshake cost |
| `maxConnecting` (`MONGO_MAX_CONNECTING`) | 2 | limits how many new connections open at the same time during a burst |
| `maxIdleTimeMS` (`MONGO_MAX_IDLE_TIME_MS`) | 60 000 | closes connections idle for a minute, shrinking back towards `minPoolSize` |
| `waitQueueTimeoutMS` (`MONGO_WAIT_QUEUE_TIMEOUT_MS`) | 10 000 | a request waiting for a free connection fails after 10 s instead of hanging |
| `serverSelectionTimeoutMS` (`MONGO_SERVER_SELECTION_TIMEOUT_MS`) | 5 000 | fail fast when MongoDB is unreachable |
| `socketTimeoutMS` (`MONGO_SOCKET_TIMEOUT_MS`) | 45 000 | drop a connection whose operation stalls |

Short-lived scripts (`migrate`, `bootstrap`, `explain`) use a small pool (`maxPoolSize` 5, nothing kept warm).
On `SIGTERM` / `SIGINT` (e.g. `docker stop`) the API stops accepting requests, lets the open ones finish and
then closes the pool. The startup log shows `MongoDB connected (pool 2–20 connections)`.

## 1. Architecture

TypeScript, Express, Mongoose, laid out in Spring-style layers:
`routes → middleware (auth, authorize, validation) → controller → service → repository → MongoDB`.
Only repositories (`src/repositories/mongo/`) touch Mongoose models, so every database query is in one
place for review. Each repository method's doc comment names the index it uses.

Collections, validators and indexes are created by migrations (`migrations/*.ts`, `npm run migrate`), not
implicitly: Mongoose runs with `autoIndex` and `autoCreate` off.

## 2. Roles and permissions

Roles are stored in the database (`roles`, `permissions`, `role_permissions`), so an admin can adjust them
without code changes. Every request reloads the user and their permissions, so a change applies
immediately.

| Permission | Allows | `user` | `admin` |
|---|---|---|---|
| `notes.manage_own` | create, list and view own notes | ✓ | ✓ |
| `notes.update_own` | update own notes (edit, pin, archive) | ✓ | ✓ |
| `notes.delete_own` | delete own notes | ✓ | ✓ |
| `notes.read_all` | view everyone's notes | | ✓ |
| `posts.create` | write posts (everyone signed in can read them) | ✓ | ✓ |
| `users.read` | list and view users, users grouped by interest | | ✓ |
| `users.manage` | create and update users, activate or deactivate them | | ✓ |
| `roles.manage` | manage roles and their permissions | | ✓ |

- **The admin inherits every user capability** because the `admin` role is granted every permission (`"*"`) and can't be edited.
- **Ownership:** a user's note routes always filter by `user_id`, so another user's note returns 404, which doesn't reveal that it exists.
- **No privilege escalation:** you can only grant permissions you hold yourself, and only manage users whose role you out-rank.

## 3. Authentication and password security

- **Passwords:** bcrypt with cost 12, hashed in a Mongoose pre-save hook. The field is `select: false` and stripped from JSON. The `users` collection validator only accepts bcrypt hashes, so a plaintext password is rejected by the database itself.
- **JWT:** HS256 with a 1h expiry by default (`JWT_EXPIRES_IN`). The token carries only the user id. The secret is required at startup and must be at least 32 characters.
- **Per request:** the user is reloaded from the database. A deactivated user is refused with `401 ACCOUNT_DISABLED`, a token for a user that no longer exists with `401 UNAUTHORIZED`, and an expired token with `401 TOKEN_EXPIRED`.
- **Rate limiting:** login, register and password change are rate limited.
- **Change password:** `POST /api/auth/me/password` requires the current password, and the new one must be confirmed.

## 4. Indexes

### Pagination (4A)

Every list endpoint takes `?page=` (default 1) and `?limit=` (default 20, max 100) and returns
`{ data, page, limit, total, totalPages }`. Lists sort on an indexed key, so `skip` / `limit` walk the index.
Counts use `estimatedDocumentCount()` (collection metadata, no scan) when unfiltered, and the same index as
the list otherwise.

### Every index, and the query it serves

All indexes are declared with `schema.index()` in `src/domain/*.ts`. Besides the automatic `_id` index on
each collection, there are:

| Collection | Index | Queries it serves |
|---|---|---|
| users | `{ email: 1 }` unique | sign-in lookup; unique emails; admin user search (`?q=`, email prefix) |
| users | `{ interests: 1 }` (multikey) | **Scenario 1**: the pipeline's opening `$match` / `$sort` |
| users | `{ role_id: 1 }` | "is this role still assigned?" before a role is deleted |
| notes | `{ user_id: 1, pinned_at: -1, _id: -1 }` | **a user listing their notes** (newest first, pinned first) and its count; also the category / tag / archived filters, applied to that user's notes |
| notes | `{ user_id: 1, pinned_at: -1, updatedAt: -1 }` | own notes sorted by last update *(extra feature)* |
| notes | `{ updatedAt: -1 }` | admin's all notes sorted by last update *(extra feature)* |
| notes | `{ user_id: 1, archivedAt: -1, _id: -1 }`, partial on `isArchived: true` | the Archive view *(extra feature)*; holds archived notes only |
| notes | `{ title: 'text', content: 'text' }` | note search `?q=` *(extra feature)*; `$text` requires it |
| posts | `{ user_id: 1, _id: -1 }` | **Scenario 2**: the `$lookup` on `user_id`, its newest-first page, and its count lookup |
| roles | `{ name: 1 }` unique | default role at sign-up, unique names, roles list |
| permissions | `{ key: 1 }` unique | permission catalog, unique keys |
| role_permissions | `{ role_id: 1, permission_id: 1 }` unique | loading a role's permissions on every request; no duplicate grants |
| categories, tags | `{ name: 1 }` unique | unique names, find-or-create, list by name *(extra feature)* |
| user_categories, user_tags | `{ user_id: 1, <label>_id: 1 }` unique | per-user label counters *(extra feature)* |

**Served by the built-in `_id` index** (no extra index needed):
- **Admin user list:** newest first, `sort({ _id: -1 })`, since ObjectIds grow over time.
- **Admin's all notes:** newest first, the same way.
- **Fetching by id:** a user profile, a user, a note or a role. `findOne({ _id, user_id })` matches at most one document on `_id`.

### Why nothing more is needed

The task's critical constraint is to avoid unnecessary indexes, so:

- **No `createdAt` indexes.** Newest-first order is `_id` order.
- **No single-field indexes on `notes.user_id` or `role_permissions.role_id`.** Each is the leading field of a compound index that already covers it.
- **No indexes for the category, tag or archived filters.** They are applied to one user's notes, which the `user_id` index already narrows to. Per-filter compound indexes existed earlier and were dropped (migration 014): they made every note write slower for a scan that was already small.
- **No index on `users.name`.** The admin user search matches the email prefix only, served by `{ email: 1 }`.
- **No index on `isActive` or `permission_id`.** A role has a handful of grants, which are filtered after the `{ role_id, permission_id }` lookup.

The four notes indexes marked *extra feature* exist only because the app offers search, sort-by-updated and
an Archive view, which the task does not ask for. Without those features they would be removed.

## 5. Aggregations (4B)

### Scenario 1: users grouped by interests ✅

`GET /api/users/interests?interest=` (`users.read`). One `User.aggregate()` call, with nothing else run before
or after (`UserAggregations.usersByInterest`):

```
$match { interests: x }   (when filtering)  or  $sort { interests: 1 }   ← walks the { interests: 1 } index
$project { name, email, interests }
$unwind  $interests
$match   { interests: x }                   (when filtering: drop the user's other interests)
$group   { _id: "$interests", count: { $sum: 1 }, users: { $push: { _id, name, email } } }
$sort    { _id: 1 }
$facet   { data: [ $skip, $limit, $project ], total: [ $count ] }   ← pagination inside the same call
```

The opening stage on `interests` makes the planner use the multikey index (`IXSCAN(interests_1)`) instead of
scanning the collection. `$facet` returns the page and the total from the single call.

### Scenario 2: a user's posts with `$lookup` ✅

`GET /api/users/:id/posts?page=&limit=`, open to any signed-in user, since posts are visible to everyone.
Users write posts with `POST /api/posts { title, body }` (`posts.create`). One `User.aggregate()` call
(`UserAggregations.userPosts`):

```
$match   { _id: userId }                                     ← _id index (EXPRESS_IXSCAN)
$project { name, email }
$lookup  { from: 'posts', localField: '_id', foreignField: 'user_id', as: 'posts',
           pipeline: [ $sort { _id: -1 }, $skip, $limit, $project { title, body, createdAt, updatedAt } ] }
$lookup  { from: 'posts', localField: '_id', foreignField: 'user_id', as: 'total',
           pipeline: [ $count ] }
$set     { total: first of total.count, or 0 }
```

Both lookups use the single posts index `{ user_id: 1, _id: -1 }`. Equality on `user_id` comes first, and
`_id` descending then gives the newest-first order, so the sort, `$skip` and `$limit` read the index in
order with no in-memory sort. The count lookup scans the same index range. The response is
`{ user, data, page, limit, total, totalPages }`, and an unknown user returns 404. Because `_id` order is
creation order, no `createdAt` index is needed.

`npm run explain` shows `EXPRESS_IXSCAN(_id_) > $lookup->IXSCAN(user_id_1__id_-1)`.

In the app, the **Posts** tab writes posts and lists them through this endpoint. It starts on your own
posts, and users with `users.read` can pick any user. Migration `015_posts_scenario_2` creates the collection,
its validator and index, and the `posts.create` permission.

## Known gaps

1. **Admins deactivate users instead of removing them.** `PATCH /api/users/:id/status { isActive: false }` ends the user's access on their next request and blocks sign-in, but keeps their data. User deletion was removed from the app at the product owner's request. The task text asks for "remove".
2. **Four extra notes indexes back features beyond the task:** search, two sorts by updated date, and the Archive view. They are each the only way to serve their query without a scan, but a strict reading of "only indexes required by the queries described above" would drop them together with those features.
