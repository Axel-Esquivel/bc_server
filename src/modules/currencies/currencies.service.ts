import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CurrencyEntity } from './entities/currency.entity';

interface CurrenciesState {
  currencies: CurrencyEntity[];
}

@Injectable()
export class CurrenciesService implements OnModuleInit {
  private readonly logger = new Logger(CurrenciesService.name);
  private readonly stateKey = 'module:currencies';
  private currencies: CurrencyEntity[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<CurrenciesState>(this.stateKey, { currencies: [] });
    this.currencies = (state.currencies ?? []).map((currency) => this.normalizeCurrency(currency));
    this.persistState();
  }

  list(query?: string): CurrencyEntity[] {
    const normalized = query?.trim().toLowerCase();
    if (!normalized) {
      return [...this.currencies];
    }
    return this.currencies.filter((currency) => {
      const haystack = [currency.code, currency.name, currency.symbol ?? ''].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }

  create(dto: CreateCurrencyDto): CurrencyEntity {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    if (!code || !name) {
      throw new BadRequestException('Currency code and name are required');
    }
    if (this.currencies.some((currency) => currency.code === code)) {
      throw new ConflictException('Currency code already exists');
    }

    const currency: CurrencyEntity = {
      id: uuid(),
      code,
      name,
      symbol: dto.symbol?.trim() || undefined,
      createdAt: new Date(),
    };

    this.currencies.push(currency);
    this.persistState();
    return currency;
  }

  update(id: string, dto: UpdateCurrencyDto): CurrencyEntity {
    const currency = this.currencies.find((item) => item.id === id);
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

    this.persistState();
    return currency;
  }

  delete(id: string): { id: string } {
    const index = this.currencies.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException('Currency not found');
    }
    const [removed] = this.currencies.splice(index, 1);
    this.persistState();
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

  private persistState(): void {
    void this.moduleState
      .saveState<CurrenciesState>(this.stateKey, { currencies: this.currencies })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist currencies: ${message}`);
      });
  }
}
