import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeComponentMacros,
  computeTotals,
  validateDish,
  toPublicDish,
} from './dishes.js';

const oats = { calories: 360, protein: 12, fat: 6, carbs: 60, fiber: 10 };

test('validateDish accepts a dish with a name and components', () => {
  const { value, error } = validateDish({
    name: 'Овсянка на молоке',
    components: [{ name: 'Овсяные хлопья', grams: 50, per100: oats }],
  });

  assert.equal(error, undefined);
  assert.equal(value.name, 'Овсянка на молоке');
  assert.equal(value.components.length, 1);
  assert.equal(value.components[0].grams, 50);
  assert.deepEqual(value.components[0].per100, oats);
});

test('validateDish trims the name and rejects an empty one', () => {
  const { error } = validateDish({
    name: '   ',
    components: [{ name: 'Овсяные хлопья', grams: 50, per100: oats }],
  });

  assert.match(error, /название блюда/);
});

test('validateDish rejects a dish without components', () => {
  const { error } = validateDish({ name: 'Пустое блюдо', components: [] });

  assert.match(error, /хотя бы один компонент/);
});

test('validateDish rejects a component without per-100 macros', () => {
  const { error } = validateDish({
    name: 'Блюдо',
    components: [{ name: 'Овсяные хлопья', grams: 50 }],
  });

  assert.match(error, /пищевой ценности/);
});

test('validateDish rejects an invalid component weight', () => {
  const { error } = validateDish({
    name: 'Блюдо',
    components: [{ name: 'Овсяные хлопья', grams: 'много', per100: oats }],
  });

  assert.match(error, /вес компонента/);
});


test('validateDish rejects a negative fiber value', () => {
  const { error } = validateDish({
    name: 'Блюдо',
    components: [{ name: 'Овсяные хлопья', grams: 50, per100: { ...oats, fiber: -1 } }],
  });

  assert.match(error, /клетчатки/);
});

test('computeComponentMacros scales per-100 values to the given weight', () => {
  assert.deepEqual(computeComponentMacros(oats, 50), {
    calories: 180,
    protein: 6,
    fat: 3,
    carbs: 30,
    fiber: 5,
  });
});

test('computeTotals sums macros across all components', () => {
  const components = [
    { per100: oats, grams: 100, macros: computeComponentMacros(oats, 100) },
    { per100: oats, grams: 50, macros: computeComponentMacros(oats, 50) },
  ];

  assert.deepEqual(computeTotals(components), {
    calories: 540,
    protein: 18,
    fat: 9,
    carbs: 90,
    fiber: 15,
  });
});


test('computeTotals reports fiber as unavailable for legacy components without fiber data', () => {
  const legacyPer100 = { calories: 360, protein: 12, fat: 6, carbs: 60 };
  const component = {
    per100: legacyPer100,
    grams: 100,
    macros: computeComponentMacros(legacyPer100, 100),
  };

  assert.equal(computeTotals([component]).fiber, null);
});

test('toPublicDish serializes a document and recomputes macros and totals', () => {
  const doc = {
    _id: 'abc123',
    name: 'Овсянка',
    components: [{ id: '190316', name: 'Овсяные хлопья', grams: 100, sourceUrl: 'https://fitaudit.ru/food/190316', per100: oats }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const result = toPublicDish(doc);

  assert.equal(result.id, 'abc123');
  assert.equal(result.name, 'Овсянка');
  assert.deepEqual(result.components[0].macros, computeComponentMacros(oats, 100));
  assert.deepEqual(result.totals, computeComponentMacros(oats, 100));
});
