import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModuleStateService } from './module-state.service';
import { Counter, CounterSchema } from './counter.schema';
import { CounterService } from './counter.service';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }])],
  providers: [ModuleStateService, CounterService],
  exports: [ModuleStateService, CounterService],
})
export class DatabaseModule {}
