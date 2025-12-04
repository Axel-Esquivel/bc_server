import { Global, Module } from '@nestjs/common';
import { ModuleStateService } from './module-state.service';

@Global()
@Module({
  providers: [ModuleStateService],
  exports: [ModuleStateService],
})
export class DatabaseModule {}
