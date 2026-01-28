import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { CompaniesService } from '../companies/companies.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { OrganizationModuleStatus } from '../organizations/types/module-state.types';
import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { InventoryLocation, LocationType } from './entities/inventory-location.entity';

interface LocationsState {
  locations: InventoryLocation[];
}

@Injectable()
export class LocationsService implements OnModuleInit {
  private readonly logger = new Logger(LocationsService.name);
  private readonly stateKey = 'module:locations';
  private locations: InventoryLocation[] = [];

  constructor(
    private readonly moduleState: ModuleStateService,
    private readonly organizationsService: OrganizationsService,
    private readonly companiesService: CompaniesService,
  ) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<LocationsState>(this.stateKey, { locations: [] });
    this.locations = (state.locations ?? []).map((location) => this.normalizeLocation(location));
    this.persistState();
  }

  listByCompany(organizationId: string, companyId: string): InventoryLocation[] {
    this.assertModuleEnabled(organizationId);
    this.assertCompanyOrganization(organizationId, companyId);
    return this.locations.filter(
      (location) =>
        location.organizationId === organizationId && location.companyId === companyId,
    );
  }

  create(
    organizationId: string,
    companyId: string,
    dto: CreateInventoryLocationDto,
  ): InventoryLocation {
    this.assertModuleEnabled(organizationId);
    this.assertCompanyOrganization(organizationId, companyId);

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Location name is required');
    }

    const location: InventoryLocation = {
      id: uuid(),
      organizationId,
      companyId,
      name,
      type: dto.type,
      createdAt: new Date(),
    };

    this.locations.push(location);
    this.persistState();
    return location;
  }

  getLocation(id: string): InventoryLocation {
    const location = this.locations.find((item) => item.id === id);
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  private assertCompanyOrganization(organizationId: string, companyId: string): void {
    const company = this.companiesService.getCompany(companyId);
    if (company.organizationId !== organizationId) {
      throw new BadRequestException('Company does not belong to organization');
    }
  }

  private assertModuleEnabled(organizationId: string): void {
    const state = this.organizationsService.getModuleState(organizationId, 'locations');
    if (state.status === OrganizationModuleStatus.Disabled) {
      throw new BadRequestException('Locations module is disabled');
    }
  }

  private normalizeLocation(raw: unknown): InventoryLocation {
    const record = (raw && typeof raw === 'object' ? raw : {}) as Partial<InventoryLocation> & {
      createdAt?: string | Date;
      type?: LocationType | string;
    };
    const name =
      typeof record.name === 'string' && record.name.trim() ? record.name.trim() : 'Location';
    const type = this.normalizeLocationType(record.type);
    return {
      id: record.id ?? uuid(),
      organizationId: record.organizationId ?? 'unknown',
      companyId: record.companyId ?? 'unknown',
      name,
      type,
      createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
    };
  }

  private normalizeLocationType(value: LocationType | string | undefined): LocationType {
    if (value === LocationType.Warehouse || value === 'warehouse') {
      return LocationType.Warehouse;
    }
    return LocationType.Branch;
  }

  private persistState(): void {
    void this.moduleState
      .saveState<LocationsState>(this.stateKey, { locations: this.locations })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist locations: ${message}`);
      });
  }
}
