import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { ISO_3166_COUNTRIES } from './data/iso-3166';
import { CountryEntity } from './entities/country.entity';

interface CountriesState {
  countries: CountryEntity[];
}

@Injectable()
export class CountriesService implements OnModuleInit {
  private readonly logger = new Logger(CountriesService.name);
  private readonly stateKey = 'module:countries';
  private countries: CountryEntity[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<CountriesState>(this.stateKey, { countries: [] });
    const normalized = (state.countries ?? []).map((country) => this.normalizeCountry(country));
    this.countries = normalized;
    await this.seedIfEmpty();
    this.persistState();
  }

  list(query?: string): CountryEntity[] {
    const normalizedQuery = query?.trim().toLowerCase();
    if (!normalizedQuery) {
      return [...this.countries];
    }

    return this.countries.filter((country) => {
      const haystack = [
        country.nameEs,
        country.nameEn,
        country.iso2,
        country.iso3,
        country.phoneCode ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }

  create(dto: CreateCountryDto): CountryEntity {
    const iso2 = dto.iso2.trim().toUpperCase();
    const iso3 = dto.iso3.trim().toUpperCase();
    const nameEs = dto.nameEs.trim();
    const nameEn = dto.nameEn.trim();

    if (!nameEs || !nameEn) {
      throw new BadRequestException('Country name is required');
    }

    if (this.countries.some((country) => country.iso2 === iso2 || country.iso3 === iso3)) {
      throw new ConflictException('Country code already exists');
    }

    const country: CountryEntity = {
      id: iso2,
      iso2,
      iso3,
      nameEs,
      nameEn,
      phoneCode: dto.phoneCode?.trim() || undefined,
    };

    this.countries.push(country);
    this.persistState();
    return country;
  }

  update(id: string, dto: UpdateCountryDto): CountryEntity {
    const country = this.countries.find((item) => item.id === id || item.iso2 === id);
    if (!country) {
      throw new NotFoundException('Country not found');
    }

    if (dto.nameEs !== undefined) {
      const trimmed = dto.nameEs.trim();
      if (!trimmed) {
        throw new BadRequestException('Country name is required');
      }
      country.nameEs = trimmed;
    }
    if (dto.nameEn !== undefined) {
      const trimmed = dto.nameEn.trim();
      if (!trimmed) {
        throw new BadRequestException('Country name is required');
      }
      country.nameEn = trimmed;
    }
    if (dto.phoneCode !== undefined) {
      country.phoneCode = dto.phoneCode?.trim() || undefined;
    }

    this.persistState();
    return country;
  }

  private normalizeCountry(raw: any): CountryEntity {
    const iso2 = typeof raw.iso2 === 'string' ? raw.iso2.trim().toUpperCase() : 'UN';
    const iso3 = typeof raw.iso3 === 'string' ? raw.iso3.trim().toUpperCase() : 'UNK';
    const nameEn =
      typeof raw.nameEn === 'string' && raw.nameEn.trim() ? raw.nameEn.trim() : raw.nameEs || 'Country';
    const nameEs =
      typeof raw.nameEs === 'string' && raw.nameEs.trim() ? raw.nameEs.trim() : nameEn;

    return {
      id: raw.id || iso2,
      iso2,
      iso3,
      nameEn,
      nameEs,
      phoneCode: typeof raw.phoneCode === 'string' && raw.phoneCode.trim() ? raw.phoneCode.trim() : undefined,
    };
  }

  private async seedIfEmpty(): Promise<void> {
    if (this.countries.length > 0) {
      return;
    }

    this.countries = ISO_3166_COUNTRIES.map((country) =>
      this.normalizeCountry({
        id: country.iso2,
        ...country,
      }),
    );
    await this.moduleState.saveState<CountriesState>(this.stateKey, { countries: this.countries });
    this.logger.log(`Seeded ${this.countries.length} countries`);
  }

  private persistState(): void {
    void this.moduleState
      .saveState<CountriesState>(this.stateKey, { countries: this.countries })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist countries: ${message}`);
      });
  }
}
