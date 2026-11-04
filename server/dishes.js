const MAX_DISH_NAME_LENGTH = 120;
const MAX_COMPONENT_NAME_LENGTH = 200;
const MAX_COMPONENTS = 100;
const MAX_GRAMS = 100_000;

function isNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

/**
 * Пересчитывает КБЖУ компонента с 100 г на фактический вес.
 */
export function computeComponentMacros(per100, grams) {
  const multiplier = Math.max(0, Number(grams) || 0) / 100;
  return {
    calories: Number(per100.calories) * multiplier,
    protein: Number(per100.protein) * multiplier,
    fat: Number(per100.fat) * multiplier,
    carbs: Number(per100.carbs) * multiplier,
  };
}

/**
 * Суммирует КБЖУ всех компонентов блюда.
 */
export function computeTotals(components) {
  return components.reduce(
    (acc, component) => {
      const macros = component.macros || computeComponentMacros(component.per100, component.grams);
      return {
        calories: acc.calories + Number(macros.calories || 0),
        protein: acc.protein + Number(macros.protein || 0),
        fat: acc.fat + Number(macros.fat || 0),
        carbs: acc.carbs + Number(macros.carbs || 0),
      };
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

/**
 * Проверяет входные данные блюда и возвращает нормализованный объект
 * `{ value }` либо `{ error }` с сообщением для пользователя.
 */
export function validateDish(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Некорректные данные блюда.' };
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) return { error: 'Укажите название блюда.' };
  if (name.length > MAX_DISH_NAME_LENGTH) return { error: 'Название блюда слишком длинное.' };

  if (!Array.isArray(input.components) || input.components.length === 0) {
    return { error: 'Добавьте хотя бы один компонент блюда.' };
  }
  if (input.components.length > MAX_COMPONENTS) return { error: 'Слишком много компонентов блюда.' };

  const components = [];
  for (const raw of input.components) {
    if (!raw || typeof raw !== 'object') return { error: 'Некорректный компонент блюда.' };

    const componentName = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!componentName) return { error: 'У компонента не указано название.' };
    if (componentName.length > MAX_COMPONENT_NAME_LENGTH) return { error: 'Название компонента слишком длинное.' };

    if (!isNonNegativeNumber(raw.grams)) return { error: `Неверный вес компонента «${componentName}».` };
    const grams = Number(raw.grams);
    if (grams > MAX_GRAMS) return { error: `Вес компонента «${componentName}» слишком большой.` };

    const per100 = raw.per100 && typeof raw.per100 === 'object' ? raw.per100 : null;
    const hasMacros = per100
      && ['calories', 'protein', 'fat', 'carbs'].every((key) => isNonNegativeNumber(per100[key]));
    if (!hasMacros) return { error: `У компонента «${componentName}» нет данных о пищевой ценности.` };

    components.push({
      id: raw.id != null ? String(raw.id) : undefined,
      name: componentName,
      grams,
      sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl : undefined,
      per100: {
        calories: Number(per100.calories),
        protein: Number(per100.protein),
        fat: Number(per100.fat),
        carbs: Number(per100.carbs),
      },
    });
  }

  return { value: { name, components } };
}

/**
 * Преобразует документ из хранилища в публичное представление API.
 */
export function toPublicDish(doc) {
  const components = (doc.components || []).map((component) => ({
    id: component.id,
    name: component.name,
    grams: component.grams,
    sourceUrl: component.sourceUrl,
    per100: component.per100,
    macros: component.macros || computeComponentMacros(component.per100, component.grams),
  }));

  return {
    id: doc._id != null ? String(doc._id) : String(doc.id),
    name: doc.name,
    components,
    totals: computeTotals(components),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
