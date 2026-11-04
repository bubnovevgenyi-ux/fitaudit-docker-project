import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

const kefirProduct = {
  id: '190316',
  name: 'Кефир',
  calories: 41,
  protein: 3.79,
  fat: 0.93,
  carbs: 4.48,
  fiber: 0,
  b12: 0.3,
  omega3: 0.01,
  omega6: 0,
  basisGrams: 100,
  sourceUrl: 'https://fitaudit.ru/food/190316',
};

class MemoryDishStore {
  constructor() {
    this.items = new Map();
    this.sequence = 1;
  }

  async list() {
    return [...this.items.values()];
  }

  async get(id) {
    return this.items.get(id) || null;
  }

  async create(data) {
    const id = String(this.sequence++);
    const doc = { ...data, _id: id, createdAt: new Date(), updatedAt: new Date() };
    this.items.set(id, doc);
    return doc;
  }

  async update(id, data) {
    const previous = this.items.get(id);
    if (!previous) return null;
    const doc = { ...previous, ...data, updatedAt: new Date() };
    this.items.set(id, doc);
    return doc;
  }

  async remove(id) {
    return this.items.delete(id);
  }
}

class MemoryProductStore {
  constructor() {
    this.items = new Map();
  }

  async get(id) {
    return this.items.get(String(id)) || null;
  }

  async upsert(product) {
    const doc = { productId: String(product.id), ...product, importedAt: new Date() };
    this.items.set(String(product.id), doc);
    return doc;
  }

  async list({ query = '', limit = 50, skip = 0 } = {}) {
    const all = [...this.items.values()];
    const filtered = (query
      ? all.filter((doc) => doc.name.toLowerCase().includes(query.toLowerCase()))
      : all).sort((left, right) => left.name.localeCompare(right.name, 'ru'));
    return { items: filtered.slice(skip, skip + limit), total: filtered.length };
  }

  async count() {
    return this.items.size;
  }
}

const dishComponent = {
  id: '190316',
  name: 'Кефир',
  grams: 100,
  sourceUrl: 'https://fitaudit.ru/food/190316',
  per100: { calories: 41, protein: 3.79, fat: 0.93, carbs: 4.48 },
};

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('GET /api/health returns a successful health status', async () => {
  const app = createApp({ serveClient: false });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

test('GET /api/search returns matching product names and ids from the catalog loader', async () => {
  let catalogLoadCount = 0;
  const app = createApp({
    serveClient: false,
    catalogLoader: async () => {
      catalogLoadCount += 1;
      return [
        { id: '190316', name: 'Кефир', sourceUrl: kefirProduct.sourceUrl },
        { id: '190594', name: 'Творог 2% жирности', sourceUrl: 'https://fitaudit.ru/food/190594' },
      ];
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent('кефир')}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      items: [{ id: '190316', name: 'Кефир', sourceUrl: kefirProduct.sourceUrl }],
      totalInCatalog: 2,
    });
    assert.equal(catalogLoadCount, 1);
  });
});

test('GET /api/search does not load the catalog for a query shorter than two characters', async () => {
  let catalogLoadCount = 0;
  const app = createApp({
    serveClient: false,
    catalogLoader: async () => {
      catalogLoadCount += 1;
      return [];
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search?q=к`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { items: [] });
    assert.equal(catalogLoadCount, 0);
  });
});

test('GET /api/search rejects an excessively long query', async () => {
  const app = createApp({ serveClient: false });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search?q=${'я'.repeat(101)}`);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /слишком длинный/);
  });
});

test('GET /api/products/:id returns parsed product name and KБЖУ', async () => {
  const app = createApp({
    serveClient: false,
    productStore: new MemoryProductStore(),
    productLoader: async (id) => ({ ...kefirProduct, id }),
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/190316`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), kefirProduct);
  });
});

test('GET /api/products/:id caches product data and does not reload it on the next request', async () => {
  let productLoadCount = 0;
  const app = createApp({
    serveClient: false,
    productStore: new MemoryProductStore(),
    productLoader: async (id) => {
      productLoadCount += 1;
      return { ...kefirProduct, id };
    },
  });

  await withServer(app, async (baseUrl) => {
    const first = await fetch(`${baseUrl}/api/products/190316`);
    const second = await fetch(`${baseUrl}/api/products/190316`);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), kefirProduct);
    assert.equal(productLoadCount, 1);
  });
});

test('GET /api/products/:id rejects a non-numeric product id without calling the loader', async () => {
  let productLoadCount = 0;
  const app = createApp({
    serveClient: false,
    productStore: new MemoryProductStore(),
    productLoader: async () => {
      productLoadCount += 1;
      return kefirProduct;
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/not-an-id`);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /идентификатор/);
    assert.equal(productLoadCount, 0);
  });
});

test('GET /api/search returns 502 when FitAudit catalog loading fails', async () => {
  const app = createApp({
    serveClient: false,
    catalogLoader: async () => {
      throw new Error('FitAudit недоступен');
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search?q=кефир`);
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /Не удалось получить каталог FitAudit/);
  });
});

test('GET /api/products/:id returns 502 when product page parsing fails', async () => {
  const app = createApp({
    serveClient: false,
    productStore: new MemoryProductStore(),
    productLoader: async () => {
      throw new Error('Не удалось распознать белки');
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/190316`);
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /Не удалось распознать белки/);
  });
});

test('GET /api/products/:id serves from the Mongo catalog without calling the loader', async () => {
  const store = new MemoryProductStore();
  await store.upsert(kefirProduct);
  let productLoadCount = 0;
  const app = createApp({
    serveClient: false,
    productStore: store,
    productLoader: async () => {
      productLoadCount += 1;
      return kefirProduct;
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/190316`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), kefirProduct);
    assert.equal(productLoadCount, 0);
  });
});

test('GET /api/products/:id stores a fetched product in the catalog', async () => {
  const store = new MemoryProductStore();
  const app = createApp({
    serveClient: false,
    productStore: store,
    productLoader: async (id) => ({ ...kefirProduct, id }),
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/190316`);
    assert.equal(response.status, 200);
    assert.ok(await store.get('190316'));
  });
});

test('GET /api/catalog returns stored products and supports search', async () => {
  const store = new MemoryProductStore();
  await store.upsert(kefirProduct);
  await store.upsert({ ...kefirProduct, id: '190594', name: 'Творог 2% жирности' });
  const app = createApp({ serveClient: false, productStore: store });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/catalog`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.total, 2);
    assert.equal(data.items.length, 2);

    const search = await fetch(`${baseUrl}/api/catalog?q=${encodeURIComponent('творог')}`);
    const searchData = await search.json();
    assert.equal(searchData.total, 1);
    assert.equal(searchData.items[0].name, 'Творог 2% жирности');
  });
});


test('GET /api/catalog returns the requested page and the total number of filtered products', async () => {
  const store = new MemoryProductStore();
  await store.upsert({ ...kefirProduct, id: '1', name: 'Творог' });
  await store.upsert({ ...kefirProduct, id: '2', name: 'Абрикос' });
  await store.upsert({ ...kefirProduct, id: '3', name: 'Банан' });
  const app = createApp({ serveClient: false, productStore: store });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/catalog?q=${encodeURIComponent('а')}&limit=1&skip=1`,
    );
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.total, 2);
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].name, 'Банан');
    assert.equal(data.items[0].id, '3');
  });
});

test('POST /api/catalog/import imports catalog entries into the store', async () => {
  const store = new MemoryProductStore();
  const app = createApp({
    serveClient: false,
    productStore: store,
    catalogLoader: async () => [
      { id: '190316', name: 'Кефир', sourceUrl: kefirProduct.sourceUrl },
      { id: '190594', name: 'Творог 2% жирности', sourceUrl: 'https://fitaudit.ru/food/190594' },
    ],
    productLoader: async (id) => (
      id === '190316' ? kefirProduct : { ...kefirProduct, id, name: 'Творог 2% жирности' }
    ),
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/catalog/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 2 }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.imported, 2);
    assert.equal(result.failed, 0);
    assert.equal(await store.count(), 2);
  });
});

test('POST /api/dishes creates a favorite dish and returns its totals', async () => {
  const store = new MemoryDishStore();
  const app = createApp({ serveClient: false, dishStore: store });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dishes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Кефир', components: [dishComponent] }),
    });

    assert.equal(response.status, 201);
    const dish = await response.json();
    assert.equal(dish.name, 'Кефир');
    assert.equal(dish.components.length, 1);
    assert.deepEqual(dish.components[0].macros, {
      calories: 41,
      protein: 3.79,
      fat: 0.93,
      carbs: 4.48,
    });
    assert.deepEqual(dish.totals, dish.components[0].macros);
    assert.ok(dish.id);
  });
});

test('POST /api/dishes rejects invalid dish data with 400', async () => {
  const app = createApp({ serveClient: false, dishStore: new MemoryDishStore() });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dishes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', components: [] }),
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /название блюда/);
  });
});

test('GET /api/dishes returns saved favorite dishes', async () => {
  const store = new MemoryDishStore();
  await store.create({ name: 'Кефир', components: [dishComponent] });
  const app = createApp({ serveClient: false, dishStore: store });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dishes`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].name, 'Кефир');
  });
});

test('PUT /api/dishes updates the name and a component of a dish', async () => {
  const store = new MemoryDishStore();
  const created = await store.create({ name: 'Кефир', components: [dishComponent] });
  const app = createApp({ serveClient: false, dishStore: store });

  await withServer(app, async (baseUrl) => {
    const updatedComponent = { ...dishComponent, grams: 200 };
    const response = await fetch(`${baseUrl}/api/dishes/${created._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Кефир большой порции', components: [updatedComponent] }),
    });

    assert.equal(response.status, 200);
    const dish = await response.json();
    assert.equal(dish.name, 'Кефир большой порции');
    assert.equal(dish.components[0].grams, 200);
    assert.equal(dish.totals.calories, 82);
  });
});

test('PUT /api/dishes returns 404 for an unknown dish', async () => {
  const app = createApp({ serveClient: false, dishStore: new MemoryDishStore() });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dishes/64b000000000000000000000`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Блюдо', components: [dishComponent] }),
    });

    assert.equal(response.status, 404);
    assert.match((await response.json()).error, /не найдено/);
  });
});

test('DELETE /api/dishes removes a favorite dish', async () => {
  const store = new MemoryDishStore();
  const created = await store.create({ name: 'Кефир', components: [dishComponent] });
  const app = createApp({ serveClient: false, dishStore: store });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dishes/${created._id}`, { method: 'DELETE' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal((await store.list()).length, 0);
  });
});

test('DELETE /api/dishes returns 404 for an unknown dish', async () => {
  const app = createApp({ serveClient: false, dishStore: new MemoryDishStore() });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dishes/64b000000000000000000000`, { method: 'DELETE' });
    assert.equal(response.status, 404);
    assert.match((await response.json()).error, /не найдено/);
  });
});
