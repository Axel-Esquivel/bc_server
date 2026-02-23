import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { RealtimeModule } from '../../realtime/realtime.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CompaniesModule } from '../companies/companies.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PrepaidModule } from '../prepaid/prepaid.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [InventoryModule, RealtimeModule, OrganizationsModule, CompaniesModule, OutboxModule, PrepaidModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
