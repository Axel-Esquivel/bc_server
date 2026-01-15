import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [UsersModule, RolesModule, WorkspacesModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
