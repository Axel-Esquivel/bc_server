import { OrganizationModuleState } from './module-state.types';

export interface OrganizationModuleDefinition {
  key: string;
  name: string;
  dependencies: string[];
  isSystem: boolean;
}

export interface OrganizationModuleOverviewItem extends OrganizationModuleDefinition {
  state: OrganizationModuleState;
}

export interface OrganizationModulesOverviewResponse {
  modules: OrganizationModuleOverviewItem[];
}
