import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'inventory-adjustments',
  name: 'inventory-adjustments',
  version: '1.0.0',
  enabled: true,
  dependencies: ['stock-movements', 'auth'],
  description: 'Ajustes por conteo fisico.',
  category: 'inventory',
  icon: 'pi pi-sliders-h',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;
