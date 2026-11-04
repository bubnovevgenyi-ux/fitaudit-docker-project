import { scaleMacros } from './format.js';

/**
 * Преобразует данные продукта FitAudit в компонент блюда с весом порции.
 * Сохраняются как исходные значения на 100 г (`per100`), так и пересчитанные
 * макросы для выбранного веса.
 */
export function componentFromProduct(product, grams) {
  return {
    id: product.id,
    name: product.name,
    grams,
    sourceUrl: product.sourceUrl || undefined,
    per100: {
      calories: product.calories,
      protein: product.protein,
      fat: product.fat,
      carbs: product.carbs,
    },
    macros: scaleMacros(product, grams),
  };
}

/**
 * Суммирует КБЖУ всех компонентов блюда.
 */
export function computeTotals(components) {
  return components.reduce(
    (acc, component) => {
      const macros = component.macros || (component.per100 ? scaleMacros(component.per100, component.grams) : null);
      if (!macros) return acc;
      return {
        calories: acc.calories + (macros.calories || 0),
        protein: acc.protein + (macros.protein || 0),
        fat: acc.fat + (macros.fat || 0),
        carbs: acc.carbs + (macros.carbs || 0),
      };
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

/**
 * Формирует полезную нагрузку для отправки блюда на сервер:
 * оставляет только сериализуемые поля компонентов.
 */
export function dishToPayload(name, components) {
  return {
    name,
    components: components.map(({ id, name, grams, sourceUrl, per100 }) => ({
      id,
      name,
      grams,
      sourceUrl,
      per100,
    })),
  };
}
