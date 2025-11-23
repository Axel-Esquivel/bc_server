import { Module } from '@nestjs/common';
import { ModuleLoaderController } from './module-loader.controller';
import { ModuleLoaderService } from './module-loader.service';

@Module({
  controllers: [ModuleLoaderController],
  providers: [ModuleLoaderService],
  exports: [ModuleLoaderService],
})
export class ModuleLoaderModule {}
