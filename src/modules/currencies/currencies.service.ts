import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CurrencyEntity } from './entities/currency.entity';
import { Currency, CurrencyDocument } from './schemas/currency.schema';

@Injectable()
export class CurrenciesService {
  constructor(@InjectModel(Currency.name) private readonly currencyModel: Model<CurrencyDocument>) {}

  async list(query?: string): Promise<CurrencyEntity[]> {
    const normalized = query?.trim();
    if (!normalized) {
      const currencies = await this.currencyModel.find().lean().exec();
      return currencies.map((currency) => this.normalizeCurrency(currency));
    }

    const regex = new RegExp(this.escapeRegExp(normalized), 'i');
    const currencies = await this.currencyModel
      .find({
        $or: [{ code: regex }, { name: regex }, { symbol: regex }],
      })
      .lean()
      .exec();
    return currencies.map((currency) => this.normalizeCurrency(currency));
  }

  async create(dto: CreateCurrencyDto): Promise<CurrencyEntity> {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    if (!code || !name) {
      throw new BadRequestException('Currency code and name are required');
    }
    const existing = await this.currencyModel.findOne({ code }).lean().exec();
    if (existing) {
      throw new ConflictException('Currency code already exists');
    }

    const currency: CurrencyEntity = {
      id: uuid(),
      code,
      name,
      symbol: dto.symbol?.trim() || undefined,
      createdAt: new Date(),
    };

    await this.currencyModel.create(currency);
    return currency;
  }

  async update(id: string, dto: UpdateCurrencyDto): Promise<CurrencyEntity> {
    const currency = await this.currencyModel.findOne({ id }).exec();
    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Currency name is required');
      }
      currency.name = name;
    }
    if (dto.symbol !== undefined) {
      currency.symbol = dto.symbol?.trim() || undefined;
    }

    await currency.save();
    return currency.toObject() as CurrencyEntity;
  }

  async delete(id: string): Promise<{ id: string }> {
    const removed = await this.currencyModel.findOneAndDelete({ id }).lean().exec();
    if (!removed) {
      throw new NotFoundException('Currency not found');
    }
    return { id: removed.id };
  }

  private normalizeCurrency(raw: any): CurrencyEntity {
    const code = typeof raw.code === 'string' ? raw.code.trim().toUpperCase() : 'UNK';
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : code;
    return {
      id: raw.id || uuid(),
      code,
      name,
      symbol: typeof raw.symbol === 'string' && raw.symbol.trim() ? raw.symbol.trim() : undefined,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    };
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
