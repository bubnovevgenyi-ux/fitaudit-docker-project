/**
 * Импортирует записи каталога в хранилище, загружая каждую карточку продукта.
 * Возвращает статистику { imported, failed, total }.
 */
export async function importCatalog(
  catalog,
  { productLoader, productStore, concurrency = 3, delayMs = 100, onProgress } = {},
) {
  const queue = [...catalog];
  let imported = 0;
  let failed = 0;

  async function worker() {
    while (queue.length > 0) {
      const entry = queue.shift();
      try {
        const product = await productLoader(entry.id);
        await productStore.upsert(product);
        imported += 1;
      } catch (error) {
        failed += 1;
        console.error(`[catalog import ${entry.id}]`, error.message);
      }
      if (onProgress) onProgress({ imported, failed, remaining: queue.length, total: catalog.length });
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  return { imported, failed, total: catalog.length };
}
