import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from './counter.schema';

@Injectable()
export class CounterService {
  constructor(@InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>) {}

  async next(organizationId: string, key: string): Promise<number> {
    const result = await this.counterModel
      .findOneAndUpdate(
        { organizationId, key },
        { $inc: { seq: 1 }, $setOnInsert: { organizationId, key, seq: 0 } },
        { new: true, upsert: true },
      )
      .lean<Counter>()
      .exec();
    return result?.seq ?? 1;
  }
}
