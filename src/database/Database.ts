import mongoose, { type mongo } from 'mongoose';
import { singleton } from 'tsyringe';
import { NoteModel } from '../domain/Note';
import { PermissionModel } from '../domain/Permission';
import { PostModel } from '../domain/Post';
import { RoleModel } from '../domain/Role';
import { RolePermissionModel } from '../domain/RolePermission';
import { UserModel } from '../domain/User';

@singleton()
export class Database {
  static readonly models = [UserModel, NoteModel, PostModel, RoleModel, PermissionModel, RolePermissionModel] as const;

  async connect(uri: string): Promise<void> {
    // Collections, validators and indexes are created only by migrations (npm run migrate),
    // so Mongoose must not create them implicitly.
    await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  }

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
