import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'stock-movements',
  name: 'stock-movements',
  version: '1.0.0',
  enabled: true,
  dependencies: ['stock', 'locations', 'auth'],
  description: 'Ledger inmutable de movimientos de stock.',
  category: 'inventory',
  suite: 'inventory-suite',
  tags: ['inventory', 'ledger'],
  order: 40,
  icon: 'pi pi-arrows-h',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;
