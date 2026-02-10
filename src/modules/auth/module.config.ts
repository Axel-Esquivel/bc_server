const moduleConfig = {
  key: 'auth',
  name: 'auth',
  version: '1.0.0',
  enabled: true,
  dependencies: ['users', 'devices', 'organizations', 'companies'],
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;

