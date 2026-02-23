import { Module } from '@nestjs/common';
import { PrepaidController } from './prepaid.controller';
import { PrepaidService } from './prepaid.service';
import { PrepaidModelsProvider } from './models/prepaid-models.provider';
import { OutboxModule } from '../outbox/outbox.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OutboxModule, OrganizationsModule],
  controllers: [PrepaidController],
  providers: [PrepaidService, PrepaidModelsProvider],
  exports: [PrepaidService],
})
export class PrepaidModule {}
