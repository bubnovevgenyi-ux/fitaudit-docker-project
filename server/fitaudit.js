import * as cheerio from 'cheerio';

export const FITAUDIT_BASE_URL = 'https://fitaudit.ru';
const CATALOG_URL = `${FITAUDIT_BASE_URL}/food`;
const REQUEST_TIMEOUT_MS = 20_000;

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FoodMacroCalculator/1.0; +https://fitaudit.ru/)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.7',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`FitAudit вернул HTTP ${response.status}`);
  }

  const html = await response.text();
  if (!html || html.length < 500) {
    throw new Error('FitAudit вернул пустую или неполную HTML-страницу');
  }
  return html;
}

export function parseCatalogPage(html) {
  const $ = cheerio.load(html);
  const products = new Map();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    let url;
    try {
      url = new URL(href, FITAUDIT_BASE_URL);
    } catch {
      return;
    }

    // Принимаем только домен FitAudit (включая его поддомены), но не внешние ссылки.
    const isFitAuditHost = url.hostname === 'fitaudit.ru' || url.hostname.endsWith('.fitaudit.ru');
    if (!isFitAuditHost) return;

    const match = url.pathname.match(/^\/food\/(\d+)\/?$/);
    if (!match) return;

    const name = $(element).text().replace(/\s+/g, ' ').trim();
    if (!name || products.has(match[1])) return;

    products.set(match[1], {
      id: match[1],
      name,
      sourceUrl: `${FITAUDIT_BASE_URL}/food/${match[1]}`,
    });
  });

  return [...products.values()];
}

export async function loadCatalog() {
  const html = await fetchHtml(CATALOG_URL);
  const products = parseCatalogPage(html);
  if (products.length === 0) {
    throw new Error('Не удалось извлечь товары из каталога FitAudit: структура страницы могла измениться');
  }
  return products;
}

function normalize(value = '') {
  return value
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replace(/[^а-яa-z0-9]+/gi, ' ')
    .trim();
}

function scoreName(name, query) {
  const normalizedName = normalize(name);
  const normalizedQuery = normalize(query);
  if (!normalizedName || !normalizedQuery) return 0;
  if (normalizedName === normalizedQuery) return 100;
  if (normalizedName.startsWith(normalizedQuery)) return 90;
  if (normalizedName.includes(normalizedQuery)) return 82;

  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedWords = words.filter((word) => normalizedName.split(/\s+/).some((nameWord) => nameWord.startsWith(word) || nameWord.includes(word)));
  if (matchedWords.length === words.length) return 70 + words.length;
  if (matchedWords.length > 0) return 30 + matchedWords.length;
  return 0;
}

export function searchCatalog(products, query, limit = 12) {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  return products
    .map((product) => ({ product, score: scoreName(product.name, normalizedQuery) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'ru'))
    .slice(0, limit)
    .map(({ product }) => product);
}

function parseNumber(raw) {
  if (!raw) return null;
  const value = Number(raw.replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function extractGrams(text, nutrientName) {
  const expression = new RegExp(
    `${nutrientName}\\s*[—–:-]\\s*([\\d\\s]+(?:[,.]\\d+)?)\\s*г`,
    'i',
  );
  const match = text.match(expression);
  return match ? parseNumber(match[1]) : null;
}

/**
 * Берёт основной контент карточки до блока «Средние нормы потребления»,
 * чтобы не спутать значение нутриента продукта с суточной нормой.
 */
function mainContentText(bodyText) {
  const normsIndex = bodyText.search(/Средние\s+нормы\s+потребления/i);
  return normsIndex >= 0 ? bodyText.slice(0, normsIndex) : bodyText;
}

function extractFromMainContent(bodyText, expression) {
  const match = mainContentText(bodyText).match(expression);
  return match ? parseNumber(match[1]) : null;
}

function parseOptionalNumber(raw) {
  if (!raw || /н\/д/i.test(raw)) return null;
  const match = raw.match(/[\d\s]+(?:[,.]\d+)?/);
  return match ? parseNumber(match[0]) : null;
}

export function parseProductPage(html, id) {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const name = title.split(/\s+[—–-]\s+/)[0].trim();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  // На карточках FitAudit значения БЖУ приведены в абзаце "Состав ...".
  const compositionStart = bodyText.search(/Состав\s+[^:]{0,100}:/i);
  const compositionText = compositionStart >= 0
    ? bodyText.slice(compositionStart, compositionStart + 500)
    : '';

  const protein = extractGrams(compositionText, 'белки');
  const fat = extractGrams(compositionText, 'жиры');
  const carbs = extractGrams(compositionText, 'углеводы');

  const caloriesMatch = bodyText.match(/Калорийность\s*[—–:-]\s*([\d\s]+(?:[,.]\d+)?)\s*ккал/i);
  const calories = caloriesMatch ? parseNumber(caloriesMatch[1]) : null;

  const fiber = extractFromMainContent(
    bodyText,
    /клетчатк[а-яё]*\s*[—–:-]\s*([\d\s]+(?:[,.]\d+)?)\s*г/i,
  );
  const b12 = extractFromMainContent(
    bodyText,
    /Витамин\s*B12\s*[—–:-]?\s*([\d\s]+(?:[,.]\d+)?)\s*мкг/i,
  );

  const missing = [];
  if (calories === null) missing.push('калорийность');
  if (protein === null) missing.push('белки');
  if (fat === null) missing.push('жиры');
  if (carbs === null) missing.push('углеводы');

  if (!name || missing.length > 0) {
    throw new Error(
      missing.length
        ? `Не удалось распознать на странице FitAudit: ${missing.join(', ')}. Возможно, сайт изменил разметку.`
        : 'Не удалось определить название продукта на странице FitAudit.',
    );
  }

  return {
    id: String(id),
    name,
    calories,
    protein,
    fat,
    carbs,
    fiber,
    b12,
    basisGrams: 100,
    sourceUrl: `${FITAUDIT_BASE_URL}/food/${id}`,
  };
}

export async function loadProduct(id) {
  if (!/^\d+$/.test(String(id))) {
    throw new Error('Некорректный идентификатор продукта');
  }
  const html = await fetchHtml(`${FITAUDIT_BASE_URL}/food/${id}`);
  return parseProductPage(html, id);
}

/**
 * Разбирает страницу «Жиры» продукта и суммирует жирные кислоты Омега-3 и Омега-6.
 * Классификация ведётся по идентификатору нутриента в URL (/nutrients/{slug}),
 * чтобы не путать «Линоленовую (18:3)» (общие 18:3) с «Альфа-линоленовой (Омега-3)».
 */
const OMEGA3_SLUGS = new Set(['alpha_linolenic', 'timnodonic', 'clupanodonic', 'docosahexaenoic']);
const OMEGA6_SLUGS = new Set(['linoleic', 'gamma_linolenic', 'eicosadienoic', 'arachidonic']);

function nutrientSlug(href) {
  const match = String(href || '').match(/\/nutrients\/([a-z0-9_]+)/);
  return match ? match[1] : null;
}

export function parseFatPage(html) {
  const $ = cheerio.load(html);
  let omega3 = 0;
  let omega6 = 0;

  $('tr').each((_, row) => {
    const cells = $(row).find('td, th');
    if (cells.length < 2) return;

    const link = $(cells[0]).find('a').first();
    const slug = nutrientSlug(link.attr('href'));
    const valueText = $(cells[1]).text().replace(/\s+/g, ' ').trim();

    const isOmega3 = slug && OMEGA3_SLUGS.has(slug);
    const isOmega6 = slug && OMEGA6_SLUGS.has(slug);
    if (!isOmega3 && !isOmega6) return;

    const value = parseOptionalNumber(valueText);
    if (value === null) return;

    if (isOmega3) omega3 += value;
    if (isOmega6) omega6 += value;
  });

  return { omega3, omega6 };
}

/**
 * Загружает полную карточку продукта: основную страницу (КБЖУ, клетчатка, B12)
 * и страницу жиров (Омега-3, Омега-6). Страница жиров загружается в фоне;
 * если она недоступна, значения Омега-3/6 остаются null.
 */
export async function loadProductFull(id) {
  if (!/^\d+$/.test(String(id))) {
    throw new Error('Некорректный идентификатор продукта');
  }

  const fatPromise = fetchHtml(`${FITAUDIT_BASE_URL}/food/${id}/fat`)
    .then((html) => parseFatPage(html))
    .catch(() => null);

  const [mainHtml, fats] = await Promise.all([
    fetchHtml(`${FITAUDIT_BASE_URL}/food/${id}`),
    fatPromise,
  ]);

  const product = parseProductPage(mainHtml, id);
  product.omega3 = fats ? fats.omega3 : null;
  product.omega6 = fats ? fats.omega6 : null;
  return product;
}
