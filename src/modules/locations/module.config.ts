import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'locations',
  name: 'locations',
  version: '1.0.0',
  enabled: true,
  dependencies: ['auth'],
  description: 'Ubicaciones y zonas internas.',
  category: 'inventory',
  suite: 'inventory-suite',
  tags: ['inventory', 'location'],
  order: 20,
  icon: 'pi pi-map',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;



