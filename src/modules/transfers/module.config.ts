import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'transfers',
  name: 'transfers',
  version: '1.0.0',
  enabled: true,
  dependencies: ['stock-movements', 'locations', 'auth'],
  description: 'Transferencias entre almacenes con flujo de transito.',
  category: 'inventory',
  icon: 'pi pi-exchange',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;
