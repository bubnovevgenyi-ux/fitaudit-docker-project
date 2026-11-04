import { MongoClient, ObjectId } from 'mongodb';

const DEFAULT_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017';
const DEFAULT_DB_NAME = process.env.MONGODB_DB || 'fitaudit';
const DEFAULT_COLLECTION = 'dishes';

function toObjectId(id) {
  if (typeof id !== 'string' || !ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

/**
 * Хранилище любимых блюд на базе MongoDB.
 * Подключение выполняется лениво — при первом обращении к данным.
 */
export class MongoDishStore {
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
        return client.db(this.dbName).collection(this.collectionName);
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

  async list() {
    const collection = await this.collection();
    return collection.find({}).sort({ updatedAt: -1 }).toArray();
  }

  async get(id) {
    const objectId = toObjectId(id);
    if (!objectId) return null;
    const collection = await this.collection();
    return collection.findOne({ _id: objectId });
  }

  async create(data) {
    const now = new Date();
    const doc = { ...data, createdAt: now, updatedAt: now };
    const collection = await this.collection();
    const result = await collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async update(id, data) {
    const objectId = toObjectId(id);
    if (!objectId) return null;
    const collection = await this.collection();
    const updatedAt = new Date();
    const result = await collection.updateOne(
      { _id: objectId },
      { $set: { ...data, updatedAt } },
    );
    if (result.matchedCount === 0) return null;
    return collection.findOne({ _id: objectId });
  }

  async remove(id) {
    const objectId = toObjectId(id);
    if (!objectId) return false;
    const collection = await this.collection();
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }
}
