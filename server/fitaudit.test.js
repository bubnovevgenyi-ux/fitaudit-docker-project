import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FITAUDIT_BASE_URL,
  parseCatalogPage,
  parseProductPage,
  parseFatPage,
  searchCatalog,
} from './fitaudit.js';

const kefirHtml = `
  <!doctype html>
  <html lang="ru">
    <head><title>Кефир — химический состав, пищевая ценность</title></head>
    <body>
      <h1>Кефир — химический состав, пищевая ценность, БЖУ</h1>
      <p>Кефир содержит 4,5 г углеводов в 100 г продукта, это примерно 43% энергии или 18 кКал.</p>
      <p>Калорийность — 41 кКал.</p>
      <p>Состав кефира: жиры — 0,93 г, белки — 3,79 г, углеводы — 4,48 г, вода — 90,07 г, зола — 0,72 г.</p>
    </body>
  </html>
`;

const pitaHtml = `
  <!doctype html>
  <html lang="ru"><body>
    <h1>Пита — химический состав, пищевая ценность, БЖУ</h1>
    <p>Калорийность — 275 кКал.</p>
    <p>Состав питы: жиры — 1.20 г, белки — 9.10 г, углеводы — 55.70 г, вода — 32,10 г.</p>
  </body></html>
`;

const richKefirHtml = `
  <!doctype html>
  <html lang="ru">
    <head><title>Кефир — химический состав, пищевая ценность</title></head>
    <body>
      <h1>Кефир — химический состав, пищевая ценность, БЖУ</h1>
      <p>Калорийность — 41 кКал.</p>
      <p>Состав кефира: жиры — 0,93 г, белки — 3,79 г, углеводы — 4,48 г, вода — 90,07 г, зола — 0,72 г.</p>
      <p>Суммарное содержание сахаров — 4,6 г, клетчатки — 0,0 г, крахмала — н/д.</p>
      <table>
        <tr><td>Витамин B12</td><td>0,3 мкг</td><td>12,1%</td></tr>
      </table>
    </body>
  </html>
`;

const fatPageHtml = `
  <!doctype html>
  <html lang="ru"><body>
    <h1>Кефир — содержание жиров</h1>
    <table>
      <tr><td><a href="/nutrients/fat_saturated">Насыщенные жирные кислоты</a></td><td>0,66 г</td></tr>
      <tr><td><a href="/nutrients/linoleic">Линолевая кислота (18:2)</a></td><td>0,04 г</td></tr>
      <tr><td><a href="/nutrients/linolenic">Линоленовая кислота (18:3)</a></td><td>0,01 г</td></tr>
      <tr><td><a href="/nutrients/alpha_linolenic">Альфа-линоленовая к-та (18:3) (Омега-3)</a></td><td>0,01 г</td></tr>
      <tr><td><a href="/nutrients/gamma_linolenic">Гамма-линоленовая к-та (18:3) (Омега-6)</a></td><td>0,00 г</td></tr>
      <tr><td><a href="/nutrients/eicosadienoic">Эйкозадиеновая кислота (20:2) (Омега-6)</a></td><td>0,00 г</td></tr>
      <tr><td><a href="/nutrients/arachidonic">Арахидоновая к-та (20:4) (Омега-6)</a></td><td>н/д</td></tr>
      <tr><td><a href="/nutrients/timnodonic">Тимнодоновая к-та (20:5) (Омега-3)</a></td><td>0,00 г</td></tr>
      <tr><td><a href="/nutrients/clupanodonic">Докозапентаеновая к-та (22:5) (Омега-3)</a></td><td>0,00 г</td></tr>
    </table>
  </body></html>
`;

test('parseCatalogPage extracts product id, exact title and canonical source URL', () => {
  const catalogHtml = `
    <html><body>
      <a href="/food/190316">Кефир</a>
      <a href="https://www.fitaudit.ru/food/102620/">Куриная грудка варёная или тушёная</a>
      <a href="/food/190316">Кефир — повторная ссылка</a>
      <a href="https://example.org/food/123">Внешняя ссылка</a>
      <a href="/food/abc">Некорректный id</a>
      <a href="/category/food">Категория продуктов</a>
      <a href="/food/190999"><span>  Творог </span> 2% жирности</a>
      <a href="/food/190888">   </a>
    </body></html>
  `;

  assert.deepEqual(parseCatalogPage(catalogHtml), [
    {
      id: '190316',
      name: 'Кефир',
      sourceUrl: `${FITAUDIT_BASE_URL}/food/190316`,
    },
    {
      id: '102620',
      name: 'Куриная грудка варёная или тушёная',
      sourceUrl: `${FITAUDIT_BASE_URL}/food/102620`,
    },
    {
      id: '190999',
      name: 'Творог 2% жирности',
      sourceUrl: `${FITAUDIT_BASE_URL}/food/190999`,
    },
  ]);
});

test('parseProductPage extracts product name and all nutrients from a FitAudit-style kefir card', () => {
  const product = parseProductPage(kefirHtml, '190316');

  assert.deepEqual(product, {
    id: '190316',
    name: 'Кефир',
    calories: 41,
    protein: 3.79,
    fat: 0.93,
    carbs: 4.48,
    fiber: null,
    b12: null,
    basisGrams: 100,
    sourceUrl: `${FITAUDIT_BASE_URL}/food/190316`,
  });
});

test('parseProductPage supports decimal dots and commas and keeps the full product name', () => {
  const product = parseProductPage(pitaHtml, '142788');

  assert.equal(product.name, 'Пита');
  assert.equal(product.calories, 275);
  assert.equal(product.protein, 9.1);
  assert.equal(product.fat, 1.2);
  assert.equal(product.carbs, 55.7);
});

test('parseProductPage extracts fiber and vitamin B12 from a product card', () => {
  const product = parseProductPage(richKefirHtml, '190316');

  assert.equal(product.fiber, 0);
  assert.equal(product.b12, 0.3);
});

test('parseProductPage returns null fiber and B12 when they are absent', () => {
  const product = parseProductPage(pitaHtml, '142788');

  assert.equal(product.fiber, null);
  assert.equal(product.b12, null);
});

test('parseFatPage sums Omega-3 and Omega-6 fatty acids by nutrient slug', () => {
  const fats = parseFatPage(fatPageHtml);

  // Омега-3: альфа-линоленовая (0,01) + тимнодоновая (0,00) + докозапентаеновая (0,00)
  assert.equal(fats.omega3, 0.01);
  // Омега-6: линолевая (0,04) + гамма-линоленовая (0,00) + эйкозадиеновая (0,00);
  // арахидоновая «н/д» пропущена, «линоленовая (18:3)» не учитывается как общая.
  assert.equal(fats.omega6, 0.04);
});

test('parseProductPage does not accept incomplete product data', () => {
  const html = `
    <html><body>
      <h1>Кефир — пищевая ценность</h1>
      <p>Калорийность — 41 кКал.</p>
      <p>Состав кефира: жиры — 0,93 г, белки — 3,79 г.</p>
    </body></html>
  `;

  assert.throws(
    () => parseProductPage(html, '190316'),
    /углеводы/,
  );
});

test('parseProductPage does not take BJU values from unrelated text when composition block is missing', () => {
  const html = `
    <html><body>
      <h1>Кефир — пищевая ценность</h1>
      <p>Калорийность — 41 кКал.</p>
      <p>В другом тексте встречаются белки — 3,79 г, жиры — 0,93 г и углеводы — 4,48 г.</p>
    </body></html>
  `;

  assert.throws(() => parseProductPage(html, '190316'), /белки.*жиры.*углеводы/);
});

test('parseProductPage reports that a product name is required', () => {
  const html = `
    <html><body>
      <p>Калорийность — 41 кКал.</p>
      <p>Состав кефира: жиры — 0,93 г, белки — 3,79 г, углеводы — 4,48 г.</p>
    </body></html>
  `;

  assert.throws(() => parseProductPage(html, '190316'), /название продукта/);
});

test('searchCatalog is case-insensitive, normalizes ё/е and ranks exact product names first', () => {
  const catalog = [
    { id: '1', name: 'Кефир обезжиренный' },
    { id: '2', name: 'Кефир' },
    { id: '3', name: 'Куриная грудка варёная или тушёная (без кожи)' },
    { id: '4', name: 'Яблоки свежие' },
  ];

  assert.equal(searchCatalog(catalog, 'КЕФИР')[0].id, '2');
  assert.equal(searchCatalog(catalog, 'куриная грудка')[0].id, '3');
  assert.equal(searchCatalog(catalog, 'вареная')[0].id, '3');
});

test('searchCatalog ignores too-short queries and returns at most the requested limit', () => {
  const catalog = Array.from({ length: 20 }, (_, index) => ({
    id: String(index + 1),
    name: `Кефир ${index + 1}`,
  }));

  assert.deepEqual(searchCatalog(catalog, 'к'), []);
  assert.equal(searchCatalog(catalog, 'кефир', 5).length, 5);
});
