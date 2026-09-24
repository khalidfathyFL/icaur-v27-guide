import { MongoClient, type Db } from 'mongodb'

/**
 * Serverless functions are re-invoked constantly, and a fresh connection per
 * invocation exhausts an Atlas M0 cluster's connection limit fast. The client
 * promise is cached on globalThis so warm invocations reuse one pool.
 */

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB ?? 'icaur'

declare global {
  // eslint-disable-next-line no-var
  var __icaurMongo: Promise<MongoClient> | undefined
}

function clientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to the Vercel project environment variables.')
  }

  if (!globalThis.__icaurMongo) {
    globalThis.__icaurMongo = new MongoClient(uri, {
      // Keep the pool small: many concurrent lambdas each holding connections
      // is what tips an M0 cluster over its connection limit.
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    }).connect()
  }

  return globalThis.__icaurMongo
}

let indexesReady: Promise<void> | undefined

/** Built once per cold start; every call is idempotent. */
async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('posts').createIndex({ status: 1, createdAt: -1 }),
    db.collection('posts').createIndex({ slug: 1 }, { unique: true }),
    db.collection('posts').createIndex({ authorId: 1, createdAt: -1 }),
    db.collection('suggestions').createIndex({ status: 1, createdAt: -1 }),
    db.collection('suggestions').createIndex({ authorId: 1, createdAt: -1 }),
    db.collection('dealers').createIndex({ active: 1, name: 1 }),
    db.collection('pricing').createIndex({ trim: 1 }, { unique: true }),
  ])
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise()
  const db = client.db(dbName)

  if (!indexesReady) {
    indexesReady = ensureIndexes(db).catch((error) => {
      // A failed index build should not take the whole API down; clear the
      // cache so the next cold start retries.
      indexesReady = undefined
      throw error
    })
  }
  await indexesReady

  return db
}
