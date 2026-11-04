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
      fiber: product.fiber ?? null,
    },
    macros: scaleMacros(product, grams),
  };
}

/**
 * Суммирует КБЖУ всех компонентов блюда.
 */
export function computeTotals(components) {
  const totals = components.reduce(
    (acc, component) => {
      const macros = component.macros || (component.per100 ? scaleMacros(component.per100, component.grams) : null);
      if (!macros) {
        acc.fiberAvailable = false;
        return acc;
      }
      acc.calories += macros.calories || 0;
      acc.protein += macros.protein || 0;
      acc.fat += macros.fat || 0;
      acc.carbs += macros.carbs || 0;
      if (macros.fiber == null) acc.fiberAvailable = false;
      else acc.fiber += Number(macros.fiber);
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, fiberAvailable: components.length > 0 },
  );

  return {
    calories: totals.calories,
    protein: totals.protein,
    fat: totals.fat,
    carbs: totals.carbs,
    fiber: totals.fiberAvailable ? totals.fiber : null,
  };
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
