export enum LocationType {
  Branch = 'branch',
  Warehouse = 'warehouse',
}

export interface InventoryLocation {
  id: string;
  organizationId: string;
  companyId: string;
  name: string;
  type: LocationType;
  createdAt: Date;
}
