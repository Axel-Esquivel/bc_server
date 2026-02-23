import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'warehouses',
  name: 'warehouses',
  version: '1.0.0',
  enabled: true,
  dependencies: ['companies', 'branches', 'locations', 'auth'],
  description: 'Bodegas y almacenes.',
  category: 'inventario',
  icon: 'pi pi-building',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;



