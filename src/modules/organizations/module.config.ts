const moduleConfig = {
  key: 'organizations',
  name: 'organizations',
  version: '1.0.0',
  enabled: true,
  dependencies: ['accounting', 'auth', 'branches', 'companies', 'module-loader', 'price-lists', 'uom', 'users', 'warehouses'],
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;


