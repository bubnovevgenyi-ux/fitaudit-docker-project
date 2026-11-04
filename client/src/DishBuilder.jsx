import { useRef, useState } from 'react';
import IngredientPicker from './IngredientPicker.jsx';
import { formatValue } from './format.js';
import { componentFromProduct, computeTotals, dishToPayload } from './dish.js';
import { createDish } from './api.js';

export default function DishBuilder() {
  const [components, setComponents] = useState([]);
  const [dishName, setDishName] = useState('');
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' });
  const nextId = useRef(0);

  function addComponent(product, grams) {
    setComponents((previous) => [
      ...previous,
      { key: `component-${nextId.current++}`, ...componentFromProduct(product, grams) },
    ]);
  }

  function removeComponent(index) {
    setComponents((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  }

  function clearComponents() {
    setComponents([]);
    setSaveState({ status: 'idle', message: '' });
  }

  async function saveDish() {
    const name = dishName.trim();
    if (!name || components.length === 0) return;

    setSaveState({ status: 'saving', message: '' });
    try {
      await createDish(dishToPayload(name, components));
      setSaveState({ status: 'success', message: `Блюдо «${name}» добавлено в любимые.` });
      setDishName('');
      setComponents([]);
    } catch (requestError) {
      setSaveState({ status: 'error', message: requestError.message || 'Не удалось сохранить блюдо.' });
    }
  }

  const totals = computeTotals(components);

  return (
    <section className="dish-builder" aria-label="Сборка блюда из компонентов">
      <header className="dish-builder__header">
        <div className="dish-builder__eyebrow"><span /> СБОРКА БЛЮДА</div>
        <h2>Соберите блюдо из ингредиентов</h2>
        <p className="dish-builder__text">
          Добавляйте компоненты по одному: найдите продукт, укажите вес и нажмите «Добавить».
          Итоговое КБЖУ пересчитается автоматически.
        </p>
      </header>

      <div className="dish-panel">
        <IngredientPicker onAdd={addComponent} />
      </div>

      {components.length > 0 && (
        <div className="dish-list">
          <div className="dish-list__header">
            <span className="dish-list__title">Компоненты блюда ({components.length})</span>
            <button type="button" className="dish-list__clear" onClick={clearComponents}>Очистить</button>
          </div>
          <ul className="dish-list__items">
            {components.map((component, index) => (
              <li className="dish-item" key={component.key}>
                <div className="dish-item__name">
                  {component.name}
                  <span className="dish-item__grams">{formatValue(component.grams)} г</span>
                </div>
                <div className="dish-item__macros">
                  <span>{formatValue(component.macros.calories)} ккал</span>
                  <span>Б {formatValue(component.macros.protein)}</span>
                  <span>Ж {formatValue(component.macros.fat)}</span>
                  <span>У {formatValue(component.macros.carbs)}</span>
                </div>
                <button
                  type="button"
                  className="dish-item__remove"
                  onClick={() => removeComponent(index)}
                  aria-label={`Удалить ${component.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="dish-totals">
            <span className="dish-totals__label">Итого</span>
            <div className="dish-totals__values">
              <span>{formatValue(totals.calories)} <em>ккал</em></span>
              <span>Белки {formatValue(totals.protein)} г</span>
              <span>Жиры {formatValue(totals.fat)} г</span>
              <span>Углеводы {formatValue(totals.carbs)} г</span>
            </div>
          </div>

          <div className="dish-save">
            <div className="dish-save__label">Сохранить блюдо в любимые</div>
            <div className="dish-save__row">
              <input
                className="dish-save__name"
                type="text"
                value={dishName}
                onChange={(event) => setDishName(event.target.value)}
                placeholder="Название блюда"
                aria-label="Название блюда"
              />
              <button
                className="dish-save__submit"
                type="button"
                onClick={saveDish}
                disabled={saveState.status === 'saving' || !dishName.trim()}
              >
                {saveState.status === 'saving' ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
            {saveState.status === 'success' && (
              <div className="dish-save__status dish-save__status--success">{saveState.message}</div>
            )}
            {saveState.status === 'error' && (
              <div className="dish-save__status dish-save__status--error">{saveState.message}</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
