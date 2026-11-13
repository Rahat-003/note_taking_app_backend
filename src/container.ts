import 'reflect-metadata';
import { Lifecycle, container } from 'tsyringe';
import { Tokens } from './common/Tokens';
import { MongoCategoryRepository } from './repositories/mongo/MongoCategoryRepository';
import { MongoNoteRepository } from './repositories/mongo/MongoNoteRepository';
import { MongoPermissionRepository } from './repositories/mongo/MongoPermissionRepository';
import { MongoRolePermissionRepository } from './repositories/mongo/MongoRolePermissionRepository';
import { MongoRoleRepository } from './repositories/mongo/MongoRoleRepository';
import { MongoTagRepository } from './repositories/mongo/MongoTagRepository';
import { MongoUserCategoryRepository } from './repositories/mongo/MongoUserCategoryRepository';
import { MongoUserRepository } from './repositories/mongo/MongoUserRepository';
import { MongoUserTagRepository } from './repositories/mongo/MongoUserTagRepository';
import { AuthServiceImpl } from './services/impl/AuthServiceImpl';
import { AuthorizationServiceImpl } from './services/impl/AuthorizationServiceImpl';
import { CategoryServiceImpl } from './services/impl/CategoryServiceImpl';
import { NoteServiceImpl } from './services/impl/NoteServiceImpl';
import { PermissionServiceImpl } from './services/impl/PermissionServiceImpl';
import { RoleServiceImpl } from './services/impl/RoleServiceImpl';
import { TagServiceImpl } from './services/impl/TagServiceImpl';
import { TokenServiceImpl } from './services/impl/TokenServiceImpl';
import { UserServiceImpl } from './services/impl/UserServiceImpl';

// Interface token -> implementation. Everything is a stateless singleton.
const bindings: Array<[symbol, new (...args: never[]) => unknown]> = [
  [Tokens.UserRepository, MongoUserRepository],
  [Tokens.NoteRepository, MongoNoteRepository],
  [Tokens.RoleRepository, MongoRoleRepository],
  [Tokens.PermissionRepository, MongoPermissionRepository],
  [Tokens.RolePermissionRepository, MongoRolePermissionRepository],
  [Tokens.CategoryRepository, MongoCategoryRepository],
  [Tokens.TagRepository, MongoTagRepository],
  [Tokens.UserCategoryRepository, MongoUserCategoryRepository],
  [Tokens.UserTagRepository, MongoUserTagRepository],
  [Tokens.TokenService, TokenServiceImpl],
  [Tokens.AuthorizationService, AuthorizationServiceImpl],
  [Tokens.AuthService, AuthServiceImpl],
  [Tokens.UserService, UserServiceImpl],
  [Tokens.NoteService, NoteServiceImpl],
  [Tokens.RoleService, RoleServiceImpl],
  [Tokens.PermissionService, PermissionServiceImpl],
  [Tokens.CategoryService, CategoryServiceImpl],
  [Tokens.TagService, TagServiceImpl],
];

for (const [token, implementation] of bindings) {
  container.register(token, { useClass: implementation }, { lifecycle: Lifecycle.Singleton });
}

export { container };
