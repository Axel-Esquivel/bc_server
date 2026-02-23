import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'stock',
  name: 'stock',
  version: '1.0.0',
  enabled: true,
  dependencies: ['auth'],
  description: 'Stock como proyeccion por ubicacion.',
  category: 'inventario',
  icon: 'pi pi-database',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;
