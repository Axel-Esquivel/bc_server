/* eslint-disable no-console */
const mongoose = require('mongoose');

const normalizeModuleStatus = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'disabled' || normalized === 'inactive') {
      return 'disabled';
    }
    if (normalized === 'configured' || normalized === 'ready') {
      return 'configured';
    }
    if (normalized === 'enabled' || normalized === 'enabled_unconfigured' || normalized === 'pendingconfig' || normalized === 'pending_config') {
      return 'enabled_unconfigured';
    }
    return normalized;
  }
  if (typeof value === 'object' && value.status) {
    return normalizeModuleStatus(value.status);
  }
  return null;
};

const resolveEnv = (key, fallback) => {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
};

const buildMongoUri = () => {
  let uri = resolveEnv('MONGO_URI') || resolveEnv('MONGODB_URI');
  const dbName =
    resolveEnv('MONGO_DB') || resolveEnv('MONGODB_DB') || 'business-control';

  if (!uri) {
    const host = resolveEnv('MONGO_HOST') || resolveEnv('MONGODB_HOST') || 'localhost';
    const port = resolveEnv('MONGO_PORT') || resolveEnv('MONGODB_PORT') || '27017';
    const user = resolveEnv('MONGO_USER') || resolveEnv('MONGODB_USER');
    const pass = process.env.MONGO_PASSWORD || process.env.MONGODB_PASS;
    const authSource = resolveEnv('MONGO_AUTH_SOURCE') || resolveEnv('MONGODB_AUTH_SOURCE') || 'admin';

    if (user && pass !== undefined && pass !== null) {
      const encodedUser = encodeURIComponent(user);
      const encodedPass = encodeURIComponent(pass);
      uri = `mongodb://${encodedUser}:${encodedPass}@${host}:${port}/${dbName}?authSource=${authSource}`;
    } else {
      uri = `mongodb://${host}:${port}/${dbName}`;
    }
  }

  return { uri, dbName };
};

const getState = async (collection, key) => {
  const doc = await collection.findOne({ _id: key });
  return doc ? doc.data : null;
};

const upsertMany = async (collection, documents, idField) => {
  if (!documents || documents.length === 0) {
    return { processed: 0 };
  }
  const ops = documents.map((doc) => ({
    updateOne: {
      filter: { [idField]: doc[idField] },
      update: { $set: doc },
      upsert: true,
    },
  }));
  const result = await collection.bulkWrite(ops, { ordered: false });
  return {
    processed: documents.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  };
};

const migrate = async () => {
  const { uri, dbName } = buildMongoUri();
  if (!uri) {
    throw new Error('MONGO_URI/MONGODB_URI is required.');
  }

  const connection = await mongoose.createConnection(uri, { dbName }).asPromise();
  const db = connection.db;
  if (!db) {
    throw new Error('Mongo connection not initialized');
  }

  const moduleStates = db.collection('module_states');

  const usersState = await getState(moduleStates, 'module:users');
  const organizationsState = await getState(moduleStates, 'module:organizations');
  const countriesState = await getState(moduleStates, 'module:countries');
  const currenciesState = await getState(moduleStates, 'module:currencies');
  const orgModulesState = await getState(moduleStates, 'module:org_modules');

  const users = Array.isArray(usersState?.users) ? usersState.users : [];
  const organizations = Array.isArray(organizationsState?.organizations)
    ? organizationsState.organizations
    : [];
  const countries = Array.isArray(countriesState?.countries) ? countriesState.countries : [];
  const currencies = Array.isArray(currenciesState?.currencies) ? currenciesState.currencies : [];

  const usersCollection = db.collection('users');
  const organizationsCollection = db.collection('organizations');
  const countriesCollection = db.collection('countries');
  const currenciesCollection = db.collection('currencies');
  const orgModulesCollection = db.collection('org_modules');

  const normalizedUsers = users.map((user) => ({
    ...user,
    email: typeof user.email === 'string' ? user.email.toLowerCase() : user.email,
  }));

  const results = {
    users: await upsertMany(usersCollection, normalizedUsers, 'id'),
    organizations: await upsertMany(organizationsCollection, organizations, 'id'),
    countries: await upsertMany(countriesCollection, countries, 'id'),
    currencies: await upsertMany(currenciesCollection, currencies, 'id'),
    orgModules: { processed: 0, upserted: 0, modified: 0 },
  };

  const modulesFromState = Array.isArray(orgModulesState?.orgModules)
    ? orgModulesState.orgModules
    : Array.isArray(orgModulesState)
      ? orgModulesState
      : [];

  const modulesFromOrganizations = organizations.flatMap((org) => {
    const moduleStates = org.moduleStates || {};
    const moduleSettings = org.moduleSettings || {};
    return Object.entries(moduleStates)
      .map(([key, state]) => {
        const status = normalizeModuleStatus(state);
        if (!status) {
          return null;
        }
        return {
          organizationId: org.id,
          key,
          status,
          config: moduleSettings[key] || undefined,
        };
      })
      .filter(Boolean);
  });

  const combinedOrgModules = [
    ...modulesFromState,
    ...modulesFromOrganizations,
  ];

  if (combinedOrgModules.length > 0) {
    const ops = combinedOrgModules.map((doc) => ({
      updateOne: {
        filter: { organizationId: doc.organizationId, key: doc.key },
        update: { $set: doc },
        upsert: true,
      },
    }));
    const result = await orgModulesCollection.bulkWrite(ops, { ordered: false });
    results.orgModules = {
      processed: combinedOrgModules.length,
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
    };
  }

  console.log('Migration completed.');
  console.table(results);

  await connection.close();
};

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
