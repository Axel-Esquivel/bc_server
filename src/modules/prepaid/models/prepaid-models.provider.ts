import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { OrgDbService } from '../../../core/database/org-db.service';
import { OrgModelFactory } from '../../../core/database/org-model.factory';
import { PrepaidProviderDocument, PrepaidProviderSchema } from '../schemas/prepaid-provider.schema';
import { PrepaidWalletDocument, PrepaidWalletSchema } from '../schemas/prepaid-wallet.schema';
import { PrepaidDepositDocument, PrepaidDepositSchema } from '../schemas/prepaid-deposit.schema';
import { PrepaidVariantConfigDocument, PrepaidVariantConfigSchema } from '../schemas/prepaid-variant-config.schema';
import { PrepaidConsumptionDocument, PrepaidConsumptionSchema } from '../schemas/prepaid-consumption.schema';

@Injectable()
export class PrepaidModelsProvider {
  constructor(private readonly orgDb: OrgDbService, private readonly factory: OrgModelFactory) {}

  providerModel(organizationId: string): Model<PrepaidProviderDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<PrepaidProviderDocument>(
      conn,
      'PrepaidProvider',
      PrepaidProviderSchema,
      'prepaid_providers',
    );
  }

  walletModel(organizationId: string): Model<PrepaidWalletDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<PrepaidWalletDocument>(
      conn,
      'PrepaidWallet',
      PrepaidWalletSchema,
      'prepaid_wallets',
    );
  }

  depositModel(organizationId: string): Model<PrepaidDepositDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<PrepaidDepositDocument>(
      conn,
      'PrepaidDeposit',
      PrepaidDepositSchema,
      'prepaid_deposits',
    );
  }

  variantConfigModel(organizationId: string): Model<PrepaidVariantConfigDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<PrepaidVariantConfigDocument>(
      conn,
      'PrepaidVariantConfig',
      PrepaidVariantConfigSchema,
      'prepaid_variant_configs',
    );
  }

  consumptionModel(organizationId: string): Model<PrepaidConsumptionDocument> {
    const conn = this.orgDb.getConnection(organizationId);
    return this.factory.getModel<PrepaidConsumptionDocument>(
      conn,
      'PrepaidConsumption',
      PrepaidConsumptionSchema,
      'prepaid_consumptions',
    );
  }
}
