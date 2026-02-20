import { Module } from '@nestjs/common';
import { UomController } from './uom.controller';
import { UomService } from './uom.service';
import { UomModelsProvider } from './models/uom-models.provider';

@Module({
  controllers: [UomController],
  providers: [UomService, UomModelsProvider],
  exports: [UomService, UomModelsProvider],
})
export class UomModule {}
