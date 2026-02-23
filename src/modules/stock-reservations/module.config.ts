import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'stock-reservations',
  name: 'stock-reservations',
  version: '1.0.0',
  enabled: true,
  dependencies: ['stock', 'auth'],
  description: 'Reservas de stock para ventas y picking.',
  category: 'inventory',
  icon: 'pi pi-bookmark',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;
