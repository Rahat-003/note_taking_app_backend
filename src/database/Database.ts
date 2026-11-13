import mongoose, { type mongo } from 'mongoose';
import { singleton } from 'tsyringe';
import type { MongoPoolOptions } from '../config/AppConfig';
import { CategoryModel } from '../domain/Category';
import { NoteModel } from '../domain/Note';
import { PermissionModel } from '../domain/Permission';
import { PostModel } from '../domain/Post';
import { RoleModel } from '../domain/Role';
import { RolePermissionModel } from '../domain/RolePermission';
import { TagModel } from '../domain/Tag';
import { UserModel } from '../domain/User';
import { UserCategoryModel } from '../domain/UserCategory';
import { UserTagModel } from '../domain/UserTag';

@singleton()
export class Database {
  static readonly models = [
    UserModel,
    NoteModel,
    PostModel,
    RoleModel,
    PermissionModel,
    RolePermissionModel,
    CategoryModel,
    TagModel,
    UserCategoryModel,
    UserTagModel,
  ] as const;

  /** pool: driver connection pool settings (AppConfig.mongoPool for the API, mongoScriptPool for scripts). */
  async connect(uri: string, pool: MongoPoolOptions): Promise<void> {
    // Collections, validators and indexes are created only by migrations (npm run migrate),
    // so Mongoose must not create them implicitly.
    await mongoose.connect(uri, { autoIndex: false, autoCreate: false, ...pool });
  }

  /** Closes every pooled connection; in-flight operations finish first. */
  async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }

  async drop(): Promise<void> {
    await mongoose.connection.dropDatabase();
  }

  get db(): mongo.Db {
    const { db } = mongoose.connection;
    if (!db) throw new Error('Database is not connected');
    return db;
  }
}
