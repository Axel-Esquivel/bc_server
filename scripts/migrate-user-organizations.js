/* eslint-disable no-console */
const mongoose = require('mongoose');

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

  const users = db.collection('users');
  const unsetWorkspaces = process.env.UNSET_WORKSPACES === 'true';

  const setOrganizations = await users.updateMany(
    { organizations: { $exists: false } },
    { $set: { organizations: [] } }
  );

  let unsetResult = null;
  if (unsetWorkspaces) {
    unsetResult = await users.updateMany(
      { workspaces: { $exists: true } },
      { $unset: { workspaces: '' } }
    );
  }

  console.log('Migration completed.');
  console.table({
    organizationsSet: {
      matched: setOrganizations.matchedCount,
      modified: setOrganizations.modifiedCount,
    },
    workspacesUnset: unsetResult
      ? { matched: unsetResult.matchedCount, modified: unsetResult.modifiedCount }
      : 'skipped',
  });

  await connection.close();
};

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
