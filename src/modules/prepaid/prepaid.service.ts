import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { OutboxService } from '../outbox/outbox.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrepaidModelsProvider } from './models/prepaid-models.provider';
import { CreatePrepaidProviderDto } from './dto/create-prepaid-provider.dto';
import { UpdatePrepaidProviderDto } from './dto/update-prepaid-provider.dto';
import { CreatePrepaidDepositDto } from './dto/create-prepaid-deposit.dto';
import { CreatePrepaidConsumptionDto } from './dto/create-prepaid-consumption.dto';
import { CreatePrepaidVariantConfigDto } from './dto/create-prepaid-variant-config.dto';
import { UpdatePrepaidVariantConfigDto } from './dto/update-prepaid-variant-config.dto';
import type { PrepaidProviderDocument } from './schemas/prepaid-provider.schema';
import type { PrepaidWalletDocument } from './schemas/prepaid-wallet.schema';
import type { PrepaidDepositDocument } from './schemas/prepaid-deposit.schema';
import type { PrepaidConsumptionDocument } from './schemas/prepaid-consumption.schema';
import type { PrepaidVariantConfigDocument } from './schemas/prepaid-variant-config.schema';

export interface PrepaidSaleLine {
  variantId: string;
  quantity: number;
  saleLineId?: string;
}

@Injectable()
export class PrepaidService {
  constructor(
    private readonly models: PrepaidModelsProvider,
    private readonly outbox: OutboxService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async isPrepaidInstalled(organizationId: string): Promise<boolean> {
    const organization = await this.organizationsService.getOrganization(organizationId);
    return organization.installedModules?.some((module) => module.key === 'prepaid') ?? false;
  }

  async listProviders(
    organizationId: string,
    enterpriseId: string,
    companyId?: string,
  ): Promise<PrepaidProviderDocument[]> {
    const model = this.models.providerModel(organizationId);
    const enterpriseIds = await this.resolveEnterpriseIds(model, organizationId, enterpriseId, companyId);
    const query: Record<string, unknown> = { OrganizationId: organizationId, enterpriseId: { $in: enterpriseIds } };
    if (companyId) {
      query.companyId = companyId;
    }
    return model
      .find(query)
      .select('-pin')
      .lean<PrepaidProviderDocument[]>()
      .exec();
  }

  async getProviderSecret(
    organizationId: string,
    enterpriseId: string,
    providerId: string,
  ): Promise<{ pin: string | null }> {
    const model = this.models.providerModel(organizationId);
    const record = await model
      .findOne({ OrganizationId: organizationId, enterpriseId, id: providerId })
      .lean<PrepaidProviderDocument>()
      .exec();
    if (!record) {
      throw new BadRequestException('Provider not found');
    }
    return { pin: record.pin ?? null };
  }

  async createProvider(dto: CreatePrepaidProviderDto): Promise<PrepaidProviderDocument> {
    const model = this.models.providerModel(dto.OrganizationId);
    const record: PrepaidProviderDocument = {
      id: uuid(),
      name: dto.name.trim(),
      pin: dto.pin?.trim(),
      isActive: dto.isActive ?? true,
      minimumBalance: dto.minimumBalance ?? 0,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
    } as PrepaidProviderDocument;
    await model.create(record);
    return { ...record, pin: undefined } as PrepaidProviderDocument;
  }

  async updateProvider(
    id: string,
    dto: UpdatePrepaidProviderDto,
    organizationId: string,
  ): Promise<PrepaidProviderDocument> {
    const model = this.models.providerModel(organizationId);
    const record = await model.findOne({ id }).lean<PrepaidProviderDocument>().exec();
    if (!record) {
      throw new BadRequestException('Provider not found');
    }
    const next = {
      name: dto.name?.trim() ?? record.name,
      pin: dto.pin?.trim() ?? record.pin,
      isActive: dto.isActive ?? record.isActive,
      minimumBalance: dto.minimumBalance ?? record.minimumBalance ?? 0,
    };
    await model.updateOne({ id }, { $set: next }).exec();
    return { ...record, ...next, pin: undefined } as PrepaidProviderDocument;
  }

  async listBalances(
    organizationId: string,
    enterpriseId: string,
    providerId?: string,
    companyId?: string,
  ) {
    const model = this.models.walletModel(organizationId);
    const enterpriseIds = await this.resolveEnterpriseIds(model, organizationId, enterpriseId, companyId);
    const query: Record<string, unknown> = {
      OrganizationId: organizationId,
      enterpriseId: { $in: enterpriseIds },
    };
    if (companyId) {
      query.companyId = companyId;
    }
    if (providerId) {
      query.providerId = providerId;
    }
    return model.find(query).lean<PrepaidWalletDocument[]>().exec();
  }

  async deposit(dto: CreatePrepaidDepositDto): Promise<PrepaidDepositDocument> {
    if (dto.creditedAmount < 0 || dto.depositAmount < 0) {
      throw new BadRequestException('Amounts must be positive');
    }
    const margin = dto.creditedAmount - dto.depositAmount;
    const depositModel = this.models.depositModel(dto.OrganizationId);
    const walletModel = this.models.walletModel(dto.OrganizationId);

    const deposit: PrepaidDepositDocument = {
      id: uuid(),
      providerId: dto.providerId,
      depositAmount: dto.depositAmount,
      creditedAmount: dto.creditedAmount,
      margin,
      reference: dto.reference,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
    } as PrepaidDepositDocument;

    await depositModel.create(deposit);
    const wallet = await walletModel
      .findOneAndUpdate(
        {
          OrganizationId: dto.OrganizationId,
          enterpriseId: dto.enterpriseId,
          providerId: dto.providerId,
        },
        {
          $setOnInsert: {
            id: uuid(),
            OrganizationId: dto.OrganizationId,
            companyId: dto.companyId,
            enterpriseId: dto.enterpriseId,
            providerId: dto.providerId,
          },
          $inc: { balance: dto.creditedAmount },
        },
        { upsert: true, new: true },
      )
      .lean<PrepaidWalletDocument>()
      .exec();

    await this.outbox.add({
      organizationId: dto.OrganizationId,
      enterpriseId: dto.enterpriseId,
      moduleKey: 'prepaid',
      eventType: 'prepaid.wallet.deposited',
      payload: {
        providerId: dto.providerId,
        depositAmount: dto.depositAmount,
        creditedAmount: dto.creditedAmount,
        margin,
        balance: wallet?.balance ?? 0,
      },
    });

    return deposit;
  }

  async listDeposits(
    organizationId: string,
    enterpriseId: string,
    providerId?: string,
    companyId?: string,
  ) {
    const model = this.models.depositModel(organizationId);
    const enterpriseIds = await this.resolveEnterpriseIds(model, organizationId, enterpriseId, companyId);
    const query: Record<string, unknown> = {
      OrganizationId: organizationId,
      enterpriseId: { $in: enterpriseIds },
    };
    if (companyId) {
      query.companyId = companyId;
    }
    if (providerId) {
      query.providerId = providerId;
    }
    return model.find(query).lean<PrepaidDepositDocument[]>().exec();
  }

  async deleteDeposit(
    depositId: string,
    organizationId: string,
    enterpriseId: string,
  ): Promise<{ id: string }> {
    const depositModel = this.models.depositModel(organizationId);
    const walletModel = this.models.walletModel(organizationId);

    const deposit = await depositModel
      .findOne({ id: depositId, OrganizationId: organizationId, enterpriseId })
      .lean<PrepaidDepositDocument>()
      .exec();

    if (!deposit) {
      throw new BadRequestException('Deposit not found');
    }

    const wallet = await walletModel
      .findOneAndUpdate(
        {
          OrganizationId: organizationId,
          enterpriseId,
          providerId: deposit.providerId,
          balance: { $gte: deposit.creditedAmount },
        },
        { $inc: { balance: -deposit.creditedAmount } },
        { new: true },
      )
      .lean<PrepaidWalletDocument>()
      .exec();

    if (!wallet) {
      throw new BadRequestException('Insufficient balance to delete deposit');
    }

    await depositModel.deleteOne({ id: depositId }).exec();

    await this.outbox.add({
      organizationId,
      enterpriseId,
      moduleKey: 'prepaid',
      eventType: 'prepaid.wallet.deposit_deleted',
      payload: {
        depositId,
        providerId: deposit.providerId,
        creditedAmount: deposit.creditedAmount,
        balance: wallet.balance,
      },
    });

    return { id: depositId };
  }

  async createVariantConfig(dto: CreatePrepaidVariantConfigDto): Promise<PrepaidVariantConfigDocument> {
    const model = this.models.variantConfigModel(dto.OrganizationId);
    const record: PrepaidVariantConfigDocument = {
      id: uuid(),
      variantId: dto.variantId?.trim() || undefined,
      name: dto.name.trim(),
      providerId: dto.providerId,
      denomination: dto.denomination,
      durationDays: dto.durationDays,
      requestCodeTemplate: dto.requestCodeTemplate.trim(),
      isActive: dto.isActive ?? true,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
    } as PrepaidVariantConfigDocument;
    await model.create(record);
    return record;
  }

  async updateVariantConfig(
    id: string,
    dto: UpdatePrepaidVariantConfigDto,
    organizationId: string,
  ): Promise<PrepaidVariantConfigDocument> {
    const model = this.models.variantConfigModel(organizationId);
    const record = await model.findOne({ id }).lean<PrepaidVariantConfigDocument>().exec();
    if (!record) {
      throw new BadRequestException('Variant config not found');
    }
    const next = {
      providerId: dto.providerId ?? record.providerId,
      name: dto.name?.trim() ?? record.name,
      denomination: dto.denomination ?? record.denomination,
      durationDays: dto.durationDays ?? record.durationDays,
      requestCodeTemplate: dto.requestCodeTemplate?.trim() ?? record.requestCodeTemplate,
      isActive: dto.isActive ?? record.isActive,
    };
    await model.updateOne({ id }, { $set: next }).exec();
    return { ...record, ...next } as PrepaidVariantConfigDocument;
  }

  async listVariantConfigs(
    organizationId: string,
    enterpriseId: string,
    companyId?: string,
  ): Promise<PrepaidVariantConfigDocument[]> {
    const model = this.models.variantConfigModel(organizationId);
    const enterpriseIds = await this.resolveEnterpriseIds(model, organizationId, enterpriseId, companyId);
    const query: Record<string, unknown> = {
      OrganizationId: organizationId,
      enterpriseId: { $in: enterpriseIds },
    };
    if (companyId) {
      query.companyId = companyId;
    }
    return model
      .find(query)
      .lean<PrepaidVariantConfigDocument[]>()
      .exec();
  }

  async consumeForSale(
    organizationId: string,
    companyId: string,
    enterpriseId: string,
    lines: PrepaidSaleLine[],
    saleId?: string,
  ): Promise<void> {
    if (!(await this.isPrepaidInstalled(organizationId))) {
      return;
    }
    if (lines.length === 0) {
      return;
    }
    const configModel = this.models.variantConfigModel(organizationId);
    const configs = await configModel
      .find({ OrganizationId: organizationId, enterpriseId, isActive: true })
      .lean<PrepaidVariantConfigDocument[]>()
      .exec();
    if (configs.length === 0) {
      return;
    }
    const configByVariant = new Map(configs.map((item) => [item.variantId, item]));
    const walletModel = this.models.walletModel(organizationId);
    const consumptionModel = this.models.consumptionModel(organizationId);

    for (const line of lines) {
      const config = configByVariant.get(line.variantId);
      if (!config) {
        continue;
      }
      const total = config.denomination * line.quantity;
      if (total <= 0) {
        continue;
      }
      const wallet = await walletModel
        .findOneAndUpdate(
          {
            OrganizationId: organizationId,
            enterpriseId,
            providerId: config.providerId,
            balance: { $gte: total },
          },
          { $inc: { balance: -total } },
          { new: true },
        )
        .lean<PrepaidWalletDocument>()
        .exec();
      if (!wallet) {
        throw new BadRequestException('Prepaid balance is insufficient');
      }

      const consumption: PrepaidConsumptionDocument = {
        id: uuid(),
        providerId: config.providerId,
        amount: total,
        saleId,
        saleLineId: line.saleLineId,
        variantId: line.variantId,
        denomination: config.denomination,
        quantity: line.quantity,
        OrganizationId: organizationId,
        companyId,
        enterpriseId,
      } as PrepaidConsumptionDocument;
      await consumptionModel.create(consumption);

      await this.outbox.add({
        organizationId,
        enterpriseId,
        moduleKey: 'prepaid',
        eventType: 'prepaid.wallet.debited',
        payload: {
          providerId: config.providerId,
          variantId: line.variantId,
          denomination: config.denomination,
          quantity: line.quantity,
          total,
          saleId,
          saleLineId: line.saleLineId,
        },
      });
    }
  }

  async consumeBalance(dto: CreatePrepaidConsumptionDto): Promise<PrepaidConsumptionDocument> {
    if (!(await this.isPrepaidInstalled(dto.OrganizationId))) {
      throw new BadRequestException('Prepaid module is not installed');
    }
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const walletModel = this.models.walletModel(dto.OrganizationId);
    const consumptionModel = this.models.consumptionModel(dto.OrganizationId);

    const wallet = await walletModel
      .findOneAndUpdate(
        {
          OrganizationId: dto.OrganizationId,
          enterpriseId: dto.enterpriseId,
          providerId: dto.providerId,
          balance: { $gte: dto.amount },
        },
        { $inc: { balance: -dto.amount } },
        { new: true },
      )
      .lean<PrepaidWalletDocument>()
      .exec();

    if (!wallet) {
      throw new BadRequestException('Prepaid balance is insufficient');
    }

    const consumption: PrepaidConsumptionDocument = {
      id: uuid(),
      providerId: dto.providerId,
      amount: dto.amount,
      saleId: dto.saleId,
      saleLineId: dto.saleLineId,
      variantId: dto.variantId,
      denomination: dto.denomination,
      quantity: dto.quantity,
      phoneNumber: dto.phoneNumber,
      OrganizationId: dto.OrganizationId,
      companyId: dto.companyId,
      enterpriseId: dto.enterpriseId,
    } as PrepaidConsumptionDocument;

    await consumptionModel.create(consumption);

    await this.outbox.add({
      organizationId: dto.OrganizationId,
      enterpriseId: dto.enterpriseId,
      moduleKey: 'prepaid',
      eventType: 'prepaid.wallet.debited',
      payload: {
        providerId: dto.providerId,
        amount: dto.amount,
        saleId: dto.saleId,
        saleLineId: dto.saleLineId,
        variantId: dto.variantId,
        denomination: dto.denomination,
        quantity: dto.quantity,
      },
    });

    return consumption;
  }

  private async resolveEnterpriseIds(
    model: { distinct: (field: string, filter: Record<string, unknown>) => { exec(): Promise<string[]> } },
    organizationId: string,
    enterpriseId: string,
    companyId?: string,
  ): Promise<string[]> {
    const filter: Record<string, unknown> = { OrganizationId: organizationId };
    if (companyId) {
      filter.companyId = companyId;
    }
    const distinct = await model.distinct('enterpriseId', filter).exec();
    const ids = distinct
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    if (ids.includes(enterpriseId)) {
      return [enterpriseId];
    }
    return ids.length > 0 ? ids : [enterpriseId];
  }
}
