import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleLoaderController } from './module-loader.controller';
import { ModuleLoaderService } from './module-loader.service';

@Module({
  imports: [AuthModule],
  controllers: [ModuleLoaderController],
  providers: [ModuleLoaderService],
  exports: [ModuleLoaderService],
})
export class ModuleLoaderModule {}
