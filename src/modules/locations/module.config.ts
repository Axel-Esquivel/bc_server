import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'locations',
  name: 'locations',
  version: '1.0.0',
  enabled: true,
  dependencies: ['companies'],
  description: 'Ubicaciones y zonas internas.',
  category: 'inventario',
  icon: 'pi pi-map',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;



