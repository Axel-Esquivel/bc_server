import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { RealtimeModule } from '../../realtime/realtime.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [InventoryModule, RealtimeModule, WorkspacesModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
