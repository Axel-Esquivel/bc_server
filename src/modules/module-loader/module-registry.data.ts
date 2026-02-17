import { ModuleConfig } from './module.config';
import accounting from '../accounting/module.config';
import auth from '../auth/module.config';
import branches from '../branches/module.config';
import chat from '../chat/module.config';
import companies from '../companies/module.config';
import countries from '../countries/module.config';
import currencies from '../currencies/module.config';
import customers from '../customers/module.config';
import dashboard from '../dashboard/module.config';
import devices from '../devices/module.config';
import health from '../health/module.config';
import inventory from '../inventory/module.config';
import inventoryCounts from '../inventory-counts/module.config';
import locations from '../locations/module.config';
import moduleLoader from '../module-loader/module.config';
import organizations from '../organizations/module.config';
import permissions from '../permissions/module.config';
import pos from '../pos/module.config';
import priceLists from '../price-lists/module.config';
import products from '../products/module.config';
import providers from '../providers/module.config';
import purchases from '../purchases/module.config';
import reports from '../reports/module.config';
import roles from '../roles/module.config';
import uom from '../uom/module.config';
import users from '../users/module.config';
import variants from '../variants/module.config';
import warehouses from '../warehouses/module.config';

export const MODULE_REGISTRY_CONFIGS: ModuleConfig[] = [
  accounting as ModuleConfig,
  auth as ModuleConfig,
  branches as ModuleConfig,
  chat as ModuleConfig,
  companies as ModuleConfig,
  countries as ModuleConfig,
  currencies as ModuleConfig,
  customers as ModuleConfig,
  dashboard as ModuleConfig,
  devices as ModuleConfig,
  health as ModuleConfig,
  inventory as ModuleConfig,
  inventoryCounts as ModuleConfig,
  locations as ModuleConfig,
  moduleLoader as ModuleConfig,
  organizations as ModuleConfig,
  permissions as ModuleConfig,
  pos as ModuleConfig,
  priceLists as ModuleConfig,
  products as ModuleConfig,
  providers as ModuleConfig,
  purchases as ModuleConfig,
  reports as ModuleConfig,
  roles as ModuleConfig,
  uom as ModuleConfig,
  users as ModuleConfig,
  variants as ModuleConfig,
  warehouses as ModuleConfig,
];
