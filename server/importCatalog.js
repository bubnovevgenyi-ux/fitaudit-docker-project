import { loadCatalog, loadProductFull } from './fitaudit.js';
import { MongoProductStore } from './productStore.js';
import { importCatalog } from './catalog.js';

const store = new MongoProductStore();
const limit = Math.max(0, Number(process.env.IMPORT_LIMIT) || 0);
const concurrency = Math.max(1, Number(process.env.IMPORT_CONCURRENCY) || 3);
const delayMs = Math.max(0, Number(process.env.IMPORT_DELAY_MS) || 100);

async function main() {
  console.log('Загружаем список продуктов FitAudit…');
  const catalog = await loadCatalog();
  console.log(`Найдено продуктов в каталоге: ${catalog.length}`);

  const targets = limit > 0 ? catalog.slice(0, limit) : catalog;
  const result = await importCatalog(targets, {
    productLoader: loadProductFull,
    productStore: store,
    concurrency,
    delayMs,
    onProgress: ({ imported, failed, remaining, total }) => {
      const done = imported + failed;
      if (done % 25 === 0 || remaining === 0) {
        console.log(`Импорт: ${done}/${total} (ошибок: ${failed}, осталось: ${remaining})`);
      }
    },
  });

  console.log(`Готово: импортировано ${result.imported}, ошибок ${result.failed}, всего ${result.total}.`);
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Импорт прерван:', error.message);
  process.exit(1);
});
