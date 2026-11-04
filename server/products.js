/**
 * Преобразует документ каталога из хранилища в публичное представление API.
 */
export function toPublicProduct(doc) {
  return {
    id: doc.productId != null ? String(doc.productId) : String(doc.id),
    name: doc.name,
    calories: doc.calories,
    protein: doc.protein,
    fat: doc.fat,
    carbs: doc.carbs,
    fiber: doc.fiber ?? null,
    b12: doc.b12 ?? null,
    omega3: doc.omega3 ?? null,
    omega6: doc.omega6 ?? null,
    basisGrams: doc.basisGrams ?? 100,
    sourceUrl: doc.sourceUrl,
  };
}
