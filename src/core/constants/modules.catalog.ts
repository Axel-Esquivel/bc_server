export interface ModuleCatalogEntry {
  key: string;
  name: string;
  description: string;
  version: string;
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    key: 'auth',
    name: 'Authentication',
    description: 'Login, tokens, and sessions',
    version: '1.0.0',
  },
  {
    key: 'users',
    name: 'Users',
    description: 'User profiles and memberships',
    version: '1.0.0',
  },
  {
    key: 'roles',
    name: 'Roles',
    description: 'Role-based access control',
    version: '1.0.0',
  },
  {
    key: 'permissions',
    name: 'Permissions',
    description: 'Granular permissions per workspace',
    version: '1.0.0',
  },
  {
    key: 'workspaces',
    name: 'Workspaces',
    description: 'Workspace management and membership',
    version: '1.0.0',
  },
  {
    key: 'devices',
    name: 'Devices',
    description: 'Device access and audit',
    version: '1.0.0',
  },
  {
    key: 'catalogs',
    name: 'Catalogs',
    description: 'Categories and catalog setup',
    version: '1.0.0',
  },
  {
    key: 'products',
    name: 'Products',
    description: 'Products and master data',
    version: '1.0.0',
  },
  {
    key: 'variants',
    name: 'Variants',
    description: 'Sellable variants and barcodes',
    version: '1.0.0',
  },
  {
    key: 'uom',
    name: 'Units of Measure',
    description: 'Units of measure and conversions',
    version: '1.0.0',
  },
  {
    key: 'providers',
    name: 'Providers',
    description: 'Supplier management',
    version: '1.0.0',
  },
  {
    key: 'price-lists',
    name: 'Price Lists',
    description: 'Pricing and discounts',
    version: '1.0.0',
  },
  {
    key: 'warehouses',
    name: 'Warehouses',
    description: 'Warehouse locations and stock zones',
    version: '1.0.0',
  },
  {
    key: 'inventory',
    name: 'Inventory',
    description: 'Stock ledger and projections',
    version: '1.0.0',
  },
  {
    key: 'inventory-counts',
    name: 'Inventory Counts',
    description: 'Physical counts and reconciliation',
    version: '1.0.0',
  },
  {
    key: 'purchases',
    name: 'Purchases',
    description: 'Purchase orders and receipts',
    version: '1.0.0',
  },
  {
    key: 'pos',
    name: 'Point of Sale',
    description: 'Sales, carts, and payments',
    version: '1.0.0',
  },
  {
    key: 'customers',
    name: 'Customers',
    description: 'Customer records and credit',
    version: '1.0.0',
  },
  {
    key: 'accounting',
    name: 'Accounting',
    description: 'Accounts, journals, and taxes',
    version: '1.0.0',
  },
  {
    key: 'reports',
    name: 'Reports',
    description: 'Reporting and BI exports',
    version: '1.0.0',
  },
  {
    key: 'health',
    name: 'Health',
    description: 'Health checks and status',
    version: '1.0.0',
  },
  {
    key: 'realtime',
    name: 'Realtime',
    description: 'Realtime notifications',
    version: '1.0.0',
  },
  {
    key: 'chat',
    name: 'Chat',
    description: 'Internal messaging',
    version: '1.0.0',
  },
];
