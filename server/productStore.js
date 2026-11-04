import { MongoClient } from 'mongodb';

const DEFAULT_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017';
const DEFAULT_DB_NAME = process.env.MONGODB_DB || 'fitaudit';
const DEFAULT_COLLECTION = 'products';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Хранилище каталога продуктов на базе MongoDB.
 * Подключение выполняется лениво — при первом обращении к данным.
 */
export class MongoProductStore {
  constructor({
    uri = DEFAULT_URI,
    dbName = DEFAULT_DB_NAME,
    collectionName = DEFAULT_COLLECTION,
  } = {}) {
    this.uri = uri;
    this.dbName = dbName;
    this.collectionName = collectionName;
    this.client = null;
    this.connectPromise = null;
  }

  async connect() {
    if (!this.connectPromise) {
      this.connectPromise = (async () => {
        const client = new MongoClient(this.uri, { serverSelectionTimeoutMS: 5000 });
        await client.connect();
        this.client = client;
        const collection = client.db(this.dbName).collection(this.collectionName);
        await collection.createIndex({ productId: 1 }, { unique: true });
        return collection;
      })().catch((error) => {
        this.connectPromise = null;
        this.client = null;
        throw error;
      });
    }
    return this.connectPromise;
  }

  async collection() {
    return this.connect();
  }

  async get(id) {
    const collection = await this.collection();
    return collection.findOne({ productId: String(id) });
  }

  async upsert(product) {
    const doc = {
      productId: String(product.id),
      name: product.name,
      calories: product.calories,
      protein: product.protein,
      fat: product.fat,
      carbs: product.carbs,
      fiber: product.fiber ?? null,
      b12: product.b12 ?? null,
      omega3: product.omega3 ?? null,
      omega6: product.omega6 ?? null,
      basisGrams: product.basisGrams ?? 100,
      sourceUrl: product.sourceUrl,
      importedAt: new Date(),
    };
    const collection = await this.collection();
    await collection.updateOne({ productId: doc.productId }, { $set: doc }, { upsert: true });
    return doc;
  }

  async list({ query = '', limit = 50, skip = 0 } = {}) {
    const collection = await this.collection();
    const filter = query ? { name: { $regex: escapeRegex(query), $options: 'i' } } : {};
    const items = await collection
      .find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const total = await collection.countDocuments(filter);
    return { items, total };
  }

  async count() {
    const collection = await this.collection();
    return collection.countDocuments({});
  }
}
