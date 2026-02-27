import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './core/database/database.module';
import { RequestIdMiddleware } from './core/middlewares/request-id.middleware';
import { AuditContextMiddleware } from './core/middlewares/audit-context.middleware';
import { RateLimitMiddleware } from './core/middlewares/rate-limit.middleware';
import { ModuleLoaderModule } from './modules/module-loader/module-loader.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { DevicesModule } from './modules/devices/devices.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CountriesModule } from './modules/countries/countries.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { BranchesModule } from './modules/branches/branches.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { LocationsModule } from './modules/locations/locations.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InventoryCountsModule } from './modules/inventory-counts/inventory-counts.module';
import { InventoryEventsModule } from './modules/inventory-events/inventory-events.module';
import { InventoryAdjustmentsModule } from './modules/inventory-adjustments/inventory-adjustments.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { PosModule } from './modules/pos/pos.module';
import { PrepaidModule } from './modules/prepaid/prepaid.module';
import { ProductsModule } from './modules/products/products.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { StockModule } from './modules/stock/stock.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { StockReservationsModule } from './modules/stock-reservations/stock-reservations.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { UomModule } from './modules/uom/uom.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ChatModule } from './modules/chat/chat.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        let uri =
          configService.get<string>('MONGO_URI')?.trim() ||
          configService.get<string>('MONGODB_URI')?.trim();
        const dbName =
          configService.get<string>('MONGO_DB')?.trim() ||
          configService.get<string>('MONGODB_DB')?.trim() ||
          'business-control';

        if (!uri) {
          const host =
            configService.get<string>('MONGO_HOST')?.trim() ||
            configService.get<string>('MONGODB_HOST')?.trim() ||
            'localhost';
          const port =
            configService.get<string>('MONGO_PORT')?.trim() ||
            configService.get<string>('MONGODB_PORT')?.trim() ||
            '27017';
          const user =
            configService.get<string>('MONGO_USER')?.trim() ||
            configService.get<string>('MONGODB_USER')?.trim();
          const pass =
            configService.get<string>('MONGO_PASSWORD') ??
            configService.get<string>('MONGODB_PASS');
          const authSource =
            configService.get<string>('MONGO_AUTH_SOURCE')?.trim() ||
            configService.get<string>('MONGODB_AUTH_SOURCE')?.trim() ||
            'admin';

          if (user && pass !== undefined && pass !== null) {
            const encodedUser = encodeURIComponent(user);
            const encodedPass = encodeURIComponent(pass);
            uri = `mongodb://${encodedUser}:${encodedPass}@${host}:${port}/${dbName}?authSource=${authSource}`;
          } else {
            uri = `mongodb://${host}:${port}/${dbName}`;
          }
        }

        return {
          uri,
          dbName,
          appName: 'business-control-backend',
          connectionFactory: (connection: Connection) => {
            const rawUri = uri ?? '';
            const sanitizedUri = rawUri.replace(/\/\/([^:/]+):([^@]+)@/, '//$1:***@');
            const dbLabel = connection?.db?.databaseName ?? dbName ?? 'unknown';
            const host = (connection as Connection & { host?: string })?.host ?? 'unknown';
            // eslint-disable-next-line no-console
            console.log('[Mongo] uri:', sanitizedUri);
            // eslint-disable-next-line no-console
            console.log('[Mongo] db:', dbLabel);
            // eslint-disable-next-line no-console
            console.log('[Mongo] host:', host);
            connection.on('error', (error) => {
              // eslint-disable-next-line no-console
              console.error(
                'No se pudo conectar a MongoDB. Verifica la variable MONGO_URI o usa la URI por defecto.',
                error,
              );
            });
            return connection;
          },
        };
      },
    }),
    DatabaseModule,
    ModuleLoaderModule,
    HealthModule,
    UsersModule,
    CompaniesModule,
    RolesModule,
    PermissionsModule,
    OrganizationsModule,
    CountriesModule,
    CurrenciesModule,
    BranchesModule,
    DevicesModule,
    AuthModule,
    WarehousesModule,
    LocationsModule,
    InventoryModule,
    InventoryCountsModule,
    InventoryEventsModule,
    InventoryAdjustmentsModule,
    ProvidersModule,
    StockModule,
    StockMovementsModule,
    StockReservationsModule,
    TransfersModule,
    PurchasesModule,
    PosModule,
    PrepaidModule,
    ProductsModule,
    ProductCategoriesModule,
    UomModule,
    CustomersModule,
    AccountingModule,
    ReportsModule,
    DashboardModule,
    RealtimeModule,
    ChatModule,
    CoreModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, AuditContextMiddleware, RateLimitMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
