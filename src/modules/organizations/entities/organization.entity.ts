import { OrganizationStructureSettings } from '../../../core/types/organization-structure-settings.types';
import { OrganizationCoreSettings } from '../types/core-settings.types';
import { OrganizationRole, OrganizationRoleKey } from '../types/organization-role.types';
import { OrganizationModuleSettingsMap } from '../types/module-settings.types';
import { OrganizationModuleStates } from '../types/module-state.types';

export enum OrganizationMemberStatus {
  Pending = 'pending',
  Active = 'active',
}

export type OrganizationRoleDefinition = OrganizationRole;

export interface OrganizationMember {
  userId: string;
  email?: string;
  roleKey: OrganizationRoleKey;
  status: OrganizationMemberStatus;
  invitedBy?: string;
  requestedBy?: string;
  invitedAt?: Date;
  requestedAt?: Date;
  activatedAt?: Date;
  createdAt: Date;
}

export interface OrganizationEntity {
  id: string;
  name: string;
  code: string;
  ownerUserId: string;
  createdBy: string;
  countryIds: string[];
  currencyIds: string[];
  members: OrganizationMember[];
  roles: OrganizationRoleDefinition[];
  coreSettings: OrganizationCoreSettings;
  structureSettings?: OrganizationStructureSettings;
  moduleStates: OrganizationModuleStates;
  moduleSettings: OrganizationModuleSettingsMap;
  createdAt: Date;
}
