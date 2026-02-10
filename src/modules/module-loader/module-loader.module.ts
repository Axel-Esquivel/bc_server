import { Module } from '@nestjs/common';
import { ModuleLoaderController } from './module-loader.controller';
import { ModuleLoaderService } from './module-loader.service';
import { ModuleRegistryService } from './module-registry.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  controllers: [ModuleLoaderController],
  providers: [ModuleLoaderService, ModuleRegistryService, JwtAuthGuard],
  exports: [ModuleLoaderService, ModuleRegistryService],
})
export class ModuleLoaderModule {}
