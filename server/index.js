import { createApp } from './app.js';
import { MongoDishStore } from './dishStore.js';
import { MongoProductStore } from './productStore.js';

const PORT = Number(process.env.PORT) || 3001;
const dishStore = new MongoDishStore();
const productStore = new MongoProductStore();
const app = createApp({ dishStore, productStore });

app.listen(PORT, () => {
  console.log(`FitAudit API запущен: http://localhost:${PORT}`);
  console.log(`MongoDB: ${productStore.uri}/${productStore.dbName}`);
});

// Проверяем подключение к MongoDB в фоне: если база ещё не готова,
// запросы к блюдам и каталогу повторят попытку при первом обращении.
productStore
  .connect()
  .then(() => console.log('MongoDB: подключение установлено (продукты и блюда)'))
  .catch((error) => console.error('MongoDB: не удалось подключиться при старте:', error.message));
