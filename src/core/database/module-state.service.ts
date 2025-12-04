import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Collection } from 'mongodb';
import { Connection } from 'mongoose';

interface ModuleStateDocument<T = unknown> {
  _id: string;
  data: T;
  updatedAt: Date;
}

@Injectable()
export class ModuleStateService {
  private readonly logger = new Logger(ModuleStateService.name);
  private readonly collection: Collection<ModuleStateDocument>;

  constructor(@InjectConnection() connection: Connection) {
    const db = connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not initialized');
    }
    this.collection = db.collection<ModuleStateDocument>('module_states');
  }

  async loadState<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const doc = await this.collection.findOne({ _id: key });
      return (doc?.data as T) ?? defaultValue;
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Failed to load Mongo state for ${key}: ${message}`);
      return defaultValue;
    }
  }

  async saveState<T>(key: string, data: T): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: key },
        { $set: { data, updatedAt: new Date() } },
        { upsert: true },
      );
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`Failed to persist Mongo state for ${key}: ${message}`);
      throw error;
    }
  }
}
