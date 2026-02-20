import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModuleStateService } from './module-state.service';
import { Counter, CounterSchema } from './counter.schema';
import { CounterService } from './counter.service';
import { OrgDbService } from './org-db.service';
import { OrgModelFactory } from './org-model.factory';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }])],
  providers: [ModuleStateService, CounterService, OrgDbService, OrgModelFactory],
  exports: [ModuleStateService, CounterService, OrgDbService, OrgModelFactory],
})
export class DatabaseModule {}
