import { Injectable } from '@nestjs/common';
import { Connection, Model, Schema } from 'mongoose';

@Injectable()
export class OrgModelFactory {
  private readonly cache = new Map<string, Model<unknown>>();

  getModel<T>(
    connection: Connection,
    modelName: string,
    schema: Schema<T>,
    collectionName?: string,
  ): Model<T> {
    const dbName = connection.db?.databaseName ?? connection.name;
    const cacheKey = `${dbName}:${modelName}`;
    const cached = this.cache.get(cacheKey) as Model<T> | undefined;
    if (cached) {
      return cached;
    }
    const existing = connection.models[modelName] as Model<T> | undefined;
    if (existing) {
      this.cache.set(cacheKey, existing as Model<unknown>);
      return existing;
    }
    const model = connection.model<T>(modelName, schema, collectionName);
    this.cache.set(cacheKey, model as Model<unknown>);
    return model;
  }
}
