import { ModuleConfig } from '../modules/module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'realtime',
  name: 'realtime',
  version: '1.0.0',
  enabled: true,
  dependencies: ['auth'],
  description: 'Soporte de eventos en tiempo real.',
  category: 'utilities',
  tags: ['realtime', 'events'],
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;
