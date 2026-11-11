import 'reflect-metadata';
import { Lifecycle, container } from 'tsyringe';
import { Tokens } from './common/Tokens';
import { MongoNoteRepository } from './repositories/mongo/MongoNoteRepository';
import { MongoPermissionRepository } from './repositories/mongo/MongoPermissionRepository';
import { MongoPostRepository } from './repositories/mongo/MongoPostRepository';
import { MongoRolePermissionRepository } from './repositories/mongo/MongoRolePermissionRepository';
import { MongoRoleRepository } from './repositories/mongo/MongoRoleRepository';
import { MongoUserRepository } from './repositories/mongo/MongoUserRepository';
import { AuthServiceImpl } from './services/impl/AuthServiceImpl';
import { AuthorizationServiceImpl } from './services/impl/AuthorizationServiceImpl';
import { NoteServiceImpl } from './services/impl/NoteServiceImpl';
import { PermissionServiceImpl } from './services/impl/PermissionServiceImpl';
import { PostServiceImpl } from './services/impl/PostServiceImpl';
import { RoleServiceImpl } from './services/impl/RoleServiceImpl';
import { TokenServiceImpl } from './services/impl/TokenServiceImpl';
import { UserServiceImpl } from './services/impl/UserServiceImpl';

// Interface token -> implementation. Everything is a stateless singleton.
const bindings: Array<[symbol, new (...args: never[]) => unknown]> = [
  [Tokens.UserRepository, MongoUserRepository],
  [Tokens.NoteRepository, MongoNoteRepository],
  [Tokens.PostRepository, MongoPostRepository],
  [Tokens.RoleRepository, MongoRoleRepository],
  [Tokens.PermissionRepository, MongoPermissionRepository],
  [Tokens.RolePermissionRepository, MongoRolePermissionRepository],
  [Tokens.TokenService, TokenServiceImpl],
  [Tokens.AuthorizationService, AuthorizationServiceImpl],
  [Tokens.AuthService, AuthServiceImpl],
  [Tokens.UserService, UserServiceImpl],
  [Tokens.NoteService, NoteServiceImpl],
  [Tokens.PostService, PostServiceImpl],
  [Tokens.RoleService, RoleServiceImpl],
  [Tokens.PermissionService, PermissionServiceImpl],
];

for (const [token, implementation] of bindings) {
  container.register(token, { useClass: implementation }, { lifecycle: Lifecycle.Singleton });
}

export { container };
