import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CountryEntity } from './entities/country.entity';
import { Country, CountryDocument } from './schemas/country.schema';

@Injectable()
export class CountriesService {
  constructor(@InjectModel(Country.name) private readonly countryModel: Model<CountryDocument>) {}

  async list(query?: string): Promise<CountryEntity[]> {
    const normalizedQuery = query?.trim();
    if (!normalizedQuery) {
      return this.countryModel.find().lean().exec();
    }

    const regex = new RegExp(this.escapeRegExp(normalizedQuery), 'i');
    return this.countryModel
      .find({
        $or: [
          { nameEs: regex },
          { nameEn: regex },
          { iso2: regex },
          { iso3: regex },
          { phoneCode: regex },
        ],
      })
      .lean()
      .exec();
  }

  async create(dto: CreateCountryDto): Promise<CountryEntity> {
    const iso2 = (dto.iso2 ?? dto.code ?? '').trim().toUpperCase();
    if (!iso2 || iso2.length !== 2) {
      throw new BadRequestException('Country code is required');
    }

    let iso3 = (dto.iso3 ?? '').trim().toUpperCase();
    if (!iso3) {
      iso3 = (dto.code ?? dto.iso2 ?? '').trim().toUpperCase();
    }
    if (iso3.length !== 3) {
      iso3 = `${iso2}X`.slice(0, 3);
    }

    const trimmedName = dto.name?.trim() ?? '';
    const fallbackName = trimmedName;
    const nameEs = trimmedName || (dto.nameEs ?? '').trim();
    const nameEn = trimmedName || (dto.nameEn ?? '').trim() || nameEs;

    if (!nameEs && !nameEn && !fallbackName) {
      throw new BadRequestException('Country name is required');
    }

    const resolvedNameEs = nameEs || nameEn || fallbackName;
    const resolvedNameEn = nameEn || nameEs || fallbackName;

    const existing = await this.countryModel
      .findOne({ $or: [{ iso2 }, { iso3 }] })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException('Country code already exists');
    }

    const country: CountryEntity = {
      id: iso2,
      iso2,
      iso3,
      nameEs: resolvedNameEs,
      nameEn: resolvedNameEn,
      phoneCode: dto.phoneCode?.trim() || undefined,
    };

    await this.countryModel.create(country);
    return country;
  }

  async update(id: string, dto: UpdateCountryDto): Promise<CountryEntity> {
    const country = await this.countryModel
      .findOne({ $or: [{ id }, { iso2: id }] })
      .exec();
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
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Country name is required');
      }
      country.nameEs = trimmed;
      country.nameEn = trimmed;
    }
    if (dto.phoneCode !== undefined) {
      country.phoneCode = dto.phoneCode?.trim() || undefined;
    }

    await country.save();
    return country.toObject() as CountryEntity;
  }

  async delete(id: string): Promise<{ id: string }> {
    const removed = await this.countryModel
      .findOneAndDelete({ $or: [{ id }, { iso2: id }] })
      .lean()
      .exec();
    if (!removed) {
      throw new NotFoundException('Country not found');
    }
    return { id: removed.id };
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
