import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { RealtimeModule } from '../../realtime/realtime.module';
import { OrganizationsModule } from '../Organizations/Organizations.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [InventoryModule, RealtimeModule, OrganizationsModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
