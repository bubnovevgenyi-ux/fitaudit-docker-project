export const numberFormat = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
});

export function normalize(value = '') {
  return value
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replace(/[^а-яa-z0-9]+/gi, ' ')
    .trim();
}

export function formatValue(value) {
  return numberFormat.format(Number(value) || 0);
}

export async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Ошибка запроса (${response.status})`);
  }
  return data;
}

export function scaleMacros(product, grams) {
  const multiplier = Math.max(0, Number(grams) || 0) / 100;
  return {
    calories: product.calories * multiplier,
    protein: product.protein * multiplier,
    fat: product.fat * multiplier,
    carbs: product.carbs * multiplier,
  };
}

export function toGrams(value) {
  return Math.max(0, Number(String(value).replace(',', '.')) || 0);
}
