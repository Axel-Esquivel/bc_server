import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { OrgDbService } from './org-db.service';
import { OrgModelFactory } from './org-model.factory';
import { Counter, CounterSchema } from './counter.schema';

@Injectable()
export class CounterService {
  constructor(private readonly orgDb: OrgDbService, private readonly modelFactory: OrgModelFactory) {}

  async next(organizationId: string, key: string): Promise<number> {
    if (!organizationId) {
      throw new Error('OrganizationId is required');
    }
    const counterModel = this.getModel(organizationId);
    const result = await counterModel
      .findOneAndUpdate(
        { organizationId, key },
        { $setOnInsert: { seq: 0 }, $inc: { seq: 1 } },
        { new: true, upsert: true },
      )
      .lean<Counter>()
      .exec();
    return result?.seq ?? 1;
  }

  private getModel(organizationId: string): Model<Counter> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.modelFactory.getModel<Counter>(conn, Counter.name, CounterSchema, 'counters');
  }
}
