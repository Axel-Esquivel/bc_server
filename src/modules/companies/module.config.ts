const moduleConfig = {
  key: 'companies',
  name: 'companies',
  version: '1.0.0',
  enabled: true,
  dependencies: ['countries', 'currencies', 'module-loader', 'organizations', 'users'],
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;



