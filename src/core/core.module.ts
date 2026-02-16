import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { NotFoundController } from './controllers/not-found.controller';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { AccountingOutbox, AccountingOutboxSchema } from './events/accounting-outbox.schema';
import { CoreEventsService } from './events/core-events.service';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: AccountingOutbox.name, schema: AccountingOutboxSchema }])],
  controllers: [NotFoundController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    HttpExceptionFilter,
    CoreEventsService,
  ],
  exports: [CoreEventsService],
})
export class CoreModule {}
