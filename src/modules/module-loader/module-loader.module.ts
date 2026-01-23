import { Module } from '@nestjs/common';
import { ModuleLoaderController } from './module-loader.controller';
import { ModuleLoaderService } from './module-loader.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  controllers: [ModuleLoaderController],
  providers: [ModuleLoaderService, JwtAuthGuard],
  exports: [ModuleLoaderService],
})
export class ModuleLoaderModule {}
