import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const dataPath = resolve(process.cwd(), '.local-mongodb');
await mkdir(dataPath, { recursive: true });
const localMongo = await MongoMemoryReplSet.create({
  binary: { version: '8.2.6' },
  instanceOpts: [{ port: 27017, dbPath: dataPath, storageEngine: 'wiredTiger' }],
  replSet: { name: 'rs0', count: 1, ip: '127.0.0.1', storageEngine: 'wiredTiger' },
});

console.info(`Local MongoDB replica set is running with persistent data at ${dataPath}`);

let stopping = false;
async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await localMongo.stop();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
