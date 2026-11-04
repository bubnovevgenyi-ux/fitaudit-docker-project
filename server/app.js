import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadCatalog, loadProductFull, searchCatalog } from './fitaudit.js';
import { validateDish, toPublicDish } from './dishes.js';
import { MongoDishStore } from './dishStore.js';
import { toPublicProduct } from './products.js';
import { MongoProductStore } from './productStore.js';
import { importCatalog } from './catalog.js';

const DEFAULT_CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_PRODUCT_TTL_MS = 24 * 60 * 60 * 1000;
const DB_ERROR_MESSAGE = 'Не удалось получить доступ к базе данных. Проверьте, что MongoDB запущена.';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const clientDist = path.join(projectRoot, 'client', 'dist');

/**
 * Создаёт Express-приложение.
 * Loader-функции и TTL можно подменить в тестах, чтобы не обращаться к FitAudit.
 * Хранилище любимых блюд (`dishStore`) также подменяется в тестах in-memory реализацией.
 */
export function createApp({
  catalogLoader = loadCatalog,
  productLoader = loadProductFull,
  catalogTtlMs = DEFAULT_CATALOG_TTL_MS,
  productTtlMs = DEFAULT_PRODUCT_TTL_MS,
  serveClient = true,
  dishStore = new MongoDishStore(),
  productStore = new MongoProductStore(),
} = {}) {
  const app = express();
  let catalogCache = { items: null, expiresAt: 0, pending: null };
  const productCache = new Map();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  async function getCatalog() {
    if (catalogCache.items && Date.now() < catalogCache.expiresAt) return catalogCache.items;
    if (catalogCache.pending) return catalogCache.pending;

    catalogCache.pending = catalogLoader()
      .then((items) => {
        catalogCache = { items, expiresAt: Date.now() + catalogTtlMs, pending: null };
        return items;
      })
      .catch((error) => {
        catalogCache.pending = null;
        throw error;
      });

    return catalogCache.pending;
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) return res.json({ items: [] });
    if (query.length > 100) return res.status(400).json({ error: 'Запрос слишком длинный.' });

    try {
      const catalog = await getCatalog();
      const items = searchCatalog(catalog, query, 12);
      res.set('Cache-Control', 'no-store');
      return res.json({ items, totalInCatalog: catalog.length });
    } catch (error) {
      console.error('[FitAudit catalog]', error.message);
      return res.status(502).json({
        error: 'Не удалось получить каталог FitAudit. Проверьте доступность сайта и повторите запрос.',
      });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Некорректный идентификатор продукта.' });

    const cached = productCache.get(id);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.item);

    try {
      let item = null;

      // Сначала ищем в каталоге MongoDB; если база недоступна — работаем напрямую.
      try {
        const doc = await productStore.get(id);
        if (doc) item = toPublicProduct(doc);
      } catch (storeError) {
        console.error('[Products store]', storeError.message);
      }

      if (!item) {
        item = await productLoader(id);
        productStore.upsert(item).catch((upsertError) => {
          console.error('[Products upsert]', upsertError.message);
        });
      }

      productCache.set(id, { item, expiresAt: Date.now() + productTtlMs });
      return res.json(item);
    } catch (error) {
      console.error(`[FitAudit product ${id}]`, error.message);
      return res.status(502).json({
        error: error.message || 'Не удалось получить данные продукта с FitAudit.',
      });
    }
  });

  app.get('/api/catalog', async (req, res) => {
    const query = String(req.query.q || '').trim();
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 500));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    try {
      const { items, total } = await productStore.list({ query, limit, skip });
      return res.json({ items: items.map(toPublicProduct), total });
    } catch (error) {
      console.error('[Catalog list]', error.message);
      return res.status(503).json({ error: DB_ERROR_MESSAGE });
    }
  });

  app.post('/api/catalog/import', async (req, res) => {
    const body = req.body || {};
    const limit = Math.max(0, Math.min(Number(body.limit) || 0, 2000));
    const concurrency = Math.max(1, Math.min(Number(body.concurrency) || 3, 10));
    const delayMs = Math.max(0, Math.min(Number(body.delayMs) || 100, 2000));

    try {
      const catalog = await getCatalog();
      const targets = limit > 0 ? catalog.slice(0, limit) : catalog;
      const result = await importCatalog(targets, {
        productLoader,
        productStore,
        concurrency,
        delayMs,
      });
      return res.json(result);
    } catch (error) {
      console.error('[Catalog import]', error.message);
      return res.status(502).json({ error: 'Не удалось импортировать каталог FitAudit.' });
    }
  });

  app.get('/api/dishes', async (_req, res) => {
    try {
      const dishes = await dishStore.list();
      return res.json({ items: dishes.map(toPublicDish) });
    } catch (error) {
      console.error('[Dishes list]', error.message);
      return res.status(503).json({ error: DB_ERROR_MESSAGE });
    }
  });

  app.post('/api/dishes', async (req, res) => {
    const { value, error } = validateDish(req.body);
    if (error) return res.status(400).json({ error });

    try {
      const doc = await dishStore.create(value);
      return res.status(201).json(toPublicDish(doc));
    } catch (dbError) {
      console.error('[Dishes create]', dbError.message);
      return res.status(503).json({ error: DB_ERROR_MESSAGE });
    }
  });

  app.get('/api/dishes/:id', async (req, res) => {
    try {
      const doc = await dishStore.get(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Блюдо не найдено.' });
      return res.json(toPublicDish(doc));
    } catch (error) {
      console.error('[Dishes get]', error.message);
      return res.status(503).json({ error: DB_ERROR_MESSAGE });
    }
  });

  app.put('/api/dishes/:id', async (req, res) => {
    const { value, error } = validateDish(req.body);
    if (error) return res.status(400).json({ error });

    try {
      const doc = await dishStore.update(req.params.id, value);
      if (!doc) return res.status(404).json({ error: 'Блюдо не найдено.' });
      return res.json(toPublicDish(doc));
    } catch (dbError) {
      console.error('[Dishes update]', dbError.message);
      return res.status(503).json({ error: DB_ERROR_MESSAGE });
    }
  });

  app.delete('/api/dishes/:id', async (req, res) => {
    try {
      const removed = await dishStore.remove(req.params.id);
      if (!removed) return res.status(404).json({ error: 'Блюдо не найдено.' });
      return res.json({ ok: true });
    } catch (error) {
      console.error('[Dishes delete]', error.message);
      return res.status(503).json({ error: DB_ERROR_MESSAGE });
    }
  });

  if (serveClient && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  } else if (serveClient) {
    app.get('/', (_req, res) => {
      res.type('text').send('API работает. Запустите клиент командой npm run dev или соберите его через npm run build.');
    });
  }

  app.use((error, _req, res, _next) => {
    console.error('[API error]', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
  });

  return app;
}
