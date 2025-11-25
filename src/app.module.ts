import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CoreModule } from './core/core.module';
import { RequestIdMiddleware } from './core/middlewares/request-id.middleware';
import { AuditContextMiddleware } from './core/middlewares/audit-context.middleware';
import { RateLimitMiddleware } from './core/middlewares/rate-limit.middleware';
import { ModuleLoaderModule } from './modules/module-loader/module-loader.module';
import { AuthModule } from './modules/auth/auth.module';
import { DevicesModule } from './modules/devices/devices.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InventoryCountsModule } from './modules/inventory-counts/inventory-counts.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { PosModule } from './modules/pos/pos.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGO_URI')?.trim() ||
          configService.get<string>('MONGODB_URI')?.trim() ||
          'mongodb://localhost:27017/business-control',
        dbName: configService.get<string>('MONGODB_DB') || 'business-control',
        appName: 'business-control-backend',
        connectionFactory: (connection: Connection) => {
          connection.on('error', (error) => {
            // eslint-disable-next-line no-console
            console.error(
              'No se pudo conectar a MongoDB. Verifica la variable MONGO_URI o usa la URI por defecto.',
              error,
            );
          });
          return connection;
        },
      }),
    }),
    CoreModule,
    ModuleLoaderModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    WorkspacesModule,
    DevicesModule,
    AuthModule,
    CatalogsModule,
    WarehousesModule,
    InventoryModule,
    InventoryCountsModule,
    PurchasesModule,
    PosModule,
    CustomersModule,
    AccountingModule,
    ReportsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, AuditContextMiddleware, RateLimitMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
