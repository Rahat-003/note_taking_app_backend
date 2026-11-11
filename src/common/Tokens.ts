// Injection tokens for every interface-typed dependency (interfaces do not exist at runtime).
export const Tokens = {
  UserRepository: Symbol.for('UserRepository'),
  NoteRepository: Symbol.for('NoteRepository'),
  PostRepository: Symbol.for('PostRepository'),
  RoleRepository: Symbol.for('RoleRepository'),
  PermissionRepository: Symbol.for('PermissionRepository'),
  RolePermissionRepository: Symbol.for('RolePermissionRepository'),
  AuthService: Symbol.for('AuthService'),
  AuthorizationService: Symbol.for('AuthorizationService'),
  TokenService: Symbol.for('TokenService'),
  UserService: Symbol.for('UserService'),
  NoteService: Symbol.for('NoteService'),
  PostService: Symbol.for('PostService'),
  RoleService: Symbol.for('RoleService'),
  PermissionService: Symbol.for('PermissionService'),
} as const;
