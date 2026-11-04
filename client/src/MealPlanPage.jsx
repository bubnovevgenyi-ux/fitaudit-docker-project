import { useEffect, useMemo, useState } from 'react';
import { useDishes } from './useDishes.js';
import { formatValue } from './format.js';

const STORAGE_KEY = 'fitaudit-meal-plan-v1';

const MEALS = [
  { id: 'breakfast', number: '01', title: 'Завтрак', description: 'Первый приём пищи' },
  { id: 'lunch', number: '02', title: 'Обед', description: 'Основной приём пищи' },
  { id: 'dinner', number: '03', title: 'Ужин', description: 'Вечерний приём пищи' },
];

function readSavedPlan() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      breakfast: typeof value.breakfast === 'string' ? value.breakfast : '',
      lunch: typeof value.lunch === 'string' ? value.lunch : '',
      dinner: typeof value.dinner === 'string' ? value.dinner : '',
    };
  } catch {
    return { breakfast: '', lunch: '', dinner: '' };
  }
}

function formatFiber(value) {
  return value == null ? 'н/д' : formatValue(value);
}

function summarizeMeals(meals) {
  const selected = meals.filter((meal) => meal.dish);
  const totals = selected.reduce((result, meal) => {
    const values = meal.dish.totals || {};
    result.calories += Number(values.calories) || 0;
    result.protein += Number(values.protein) || 0;
    result.fat += Number(values.fat) || 0;
    result.carbs += Number(values.carbs) || 0;
    if (values.fiber == null) result.fiberAvailable = false;
    else result.fiber += Number(values.fiber) || 0;
    return result;
  }, {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    fiberAvailable: selected.length > 0,
  });

  return {
    calories: totals.calories,
    protein: totals.protein,
    fat: totals.fat,
    carbs: totals.carbs,
    fiber: selected.length === 0 ? 0 : (totals.fiberAvailable ? totals.fiber : null),
    selectedCount: selected.length,
  };
}

function MacroValue({ label, value, unit = 'г', tone }) {
  return (
    <div className={`meal-macro meal-macro--${tone || 'default'}`}>
      <span className="meal-macro__label">{label}</span>
      <strong className="meal-macro__value">
        {value == null ? 'н/д' : formatValue(value)}
        {value == null ? null : <small>{unit}</small>}
      </strong>
    </div>
  );
}

function MealCard({ meal, dishes, selectedId, onSelect }) {
  const dish = dishes.find((item) => item.id === selectedId);

  return (
    <article className="meal-card">
      <header className="meal-card__header">
        <span className="meal-card__number">{meal.number}</span>
        <div>
          <h2>{meal.title}</h2>
          <p>{meal.description}</p>
        </div>
      </header>

      <label className="meal-card__label" htmlFor={`meal-${meal.id}`}>
        Выберите блюдо из любимых
      </label>
      <select
        id={`meal-${meal.id}`}
        className="meal-card__select"
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
      >
        <option value="">Не выбрано</option>
        {dishes.map((item) => (
          <option value={item.id} key={item.id}>{item.name}</option>
        ))}
      </select>

      {dish ? (
        <div className="meal-card__content">
          <div className="meal-card__dish-name">{dish.name}</div>
          <div className="meal-card__macros">
            <MacroValue label="Калории" value={dish.totals?.calories} unit="ккал" tone="calories" />
            <MacroValue label="Белки" value={dish.totals?.protein} tone="protein" />
            <MacroValue label="Жиры" value={dish.totals?.fat} tone="fat" />
            <MacroValue label="Углеводы" value={dish.totals?.carbs} tone="carbs" />
            <MacroValue label="Клетчатка" value={dish.totals?.fiber} tone="fiber" />
          </div>

          <div className="meal-card__components-title">
            Состав блюда ({dish.components.length})
          </div>
          <div className="meal-components-wrap">
            <table className="meal-components">
              <thead>
                <tr>
                  <th>Ингредиент</th>
                  <th>Вес, г</th>
                  <th>Ккал</th>
                  <th>Белки, г</th>
                  <th>Жиры, г</th>
                  <th>Углеводы, г</th>
                  <th>Клетчатка, г</th>
                </tr>
              </thead>
              <tbody>
                {dish.components.map((component, index) => (
                  <tr key={`${component.id || component.name}-${index}`}>
                    <td>{component.name}</td>
                    <td>{formatValue(component.grams)}</td>
                    <td>{formatValue(component.macros?.calories)}</td>
                    <td>{formatValue(component.macros?.protein)}</td>
                    <td>{formatValue(component.macros?.fat)}</td>
                    <td>{formatValue(component.macros?.carbs)}</td>
                    <td>{formatFiber(component.macros?.fiber)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="meal-card__note">Показатели рассчитаны для фактического веса каждого ингредиента.</div>
        </div>
      ) : (
        <div className="meal-card__empty">
          <span className="meal-card__empty-icon" aria-hidden="true">＋</span>
          <span>Выберите блюдо — здесь появятся его КБЖУ и клетчатка.</span>
        </div>
      )}
    </article>
  );
}

export default function MealPlanPage() {
  const { dishes, loading, error, reload } = useDishes();
  const [plan, setPlan] = useState(readSavedPlan);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      // План продолжает работать в текущем сеансе, даже если хранилище браузера недоступно.
    }
  }, [plan]);

  useEffect(() => {
    if (loading || error) return;
    const availableIds = new Set(dishes.map((dish) => dish.id));
    setPlan((current) => {
      const next = { ...current };
      let changed = false;
      for (const meal of MEALS) {
        if (next[meal.id] && !availableIds.has(next[meal.id])) {
          next[meal.id] = '';
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [dishes, loading, error]);

  const meals = useMemo(() => MEALS.map((meal) => ({
    ...meal,
    dishId: plan[meal.id],
  })), [plan]);
  const selectedMeals = meals.map((meal) => ({
    ...meal,
    dish: dishes.find((dish) => dish.id === meal.dishId) || null,
  }));
  const totals = summarizeMeals(selectedMeals);

  function selectMeal(mealId, dishId) {
    setPlan((current) => ({ ...current, [mealId]: dishId }));
  }

  function clearPlan() {
    setPlan({ breakfast: '', lunch: '', dinner: '' });
  }

  return (
    <section className="meal-plan">
      <header className="meal-plan__header">
        <div className="dish-builder__eyebrow"><span /> ПИТАНИЕ НА ДЕНЬ</div>
        <h1>План питания</h1>
        <p>Выберите по одному сохранённому блюду на завтрак, обед и ужин. Сводные показатели пересчитываются автоматически.</p>

        <div className="meal-plan-summary">
          <div className="meal-plan-summary__heading">
            <div>
              <span className="meal-plan-summary__eyebrow">СУММА ЗА ДЕНЬ</span>
              <h2>Общая пищевая ценность</h2>
            </div>
            <span className="meal-plan-summary__count">Выбрано {totals.selectedCount} из 3 блюд</span>
          </div>
          <div className="meal-plan-summary__grid">
            <MacroValue label="Калорийность" value={totals.calories} unit="ккал" tone="calories" />
            <MacroValue label="Белки" value={totals.protein} tone="protein" />
            <MacroValue label="Жиры" value={totals.fat} tone="fat" />
            <MacroValue label="Углеводы" value={totals.carbs} tone="carbs" />
            <MacroValue label="Клетчатка" value={totals.fiber} tone="fiber" />
          </div>
          <p className="meal-plan-summary__hint">
            {totals.selectedCount === 3
              ? 'Учтены все три приёма пищи.'
              : 'Итог учитывает только выбранные блюда. Выберите оставшиеся приёмы пищи для полного расчёта.'}
          </p>
        </div>
      </header>

      {loading && (
        <div className="loading-state">
          <span className="spinner" />
          <span>Загружаем сохранённые блюда…</span>
        </div>
      )}

      {!loading && error && (
        <div className="error-state" role="alert">
          <strong>Не удалось загрузить любимые блюда</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>Повторить запрос</button>
        </div>
      )}

      {!loading && !error && dishes.length === 0 && (
        <div className="meal-plan__empty-state">
          <h2>Сначала сохраните блюда</h2>
          <p>План питания собирается из блюд, сохранённых на странице «Любимые блюда».</p>
          <a className="meal-plan__link" href="/favorites">Перейти к любимым блюдам</a>
        </div>
      )}

      {!loading && !error && dishes.length > 0 && (
        <>
          <div className="meal-plan__toolbar">
            <span>Три приёма пищи</span>
            <button type="button" onClick={clearPlan} disabled={totals.selectedCount === 0}>
              Очистить план
            </button>
          </div>
          <div className="meal-plan__grid">
            {selectedMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                dishes={dishes}
                selectedId={meal.dishId}
                onSelect={(dishId) => selectMeal(meal.id, dishId)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
