export interface OrganizationCompanySettings {
  id: string;
  name: string;
}

export interface OrganizationBranchSettings {
  id: string;
  companyId: string;
  name: string;
}

export interface OrganizationWarehouseSettings {
  id: string;
  branchId: string;
  name: string;
  type?: string;
}

export interface OrganizationStructureSettings {
  companies: OrganizationCompanySettings[];
  branches: OrganizationBranchSettings[];
  warehouses: OrganizationWarehouseSettings[];
}

export interface OrganizationStructureSettingsUpdate {
  companies?: OrganizationCompanySettings[];
  branches?: OrganizationBranchSettings[];
  warehouses?: OrganizationWarehouseSettings[];
}
