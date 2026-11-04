import { useState } from 'react';
import IngredientPicker from './IngredientPicker.jsx';
import { formatValue, scaleMacros, toGrams } from './format.js';
import { componentFromProduct, computeTotals, dishToPayload } from './dish.js';

export default function DishEditor({ dish, saving, onSave, onCancel }) {
  const [name, setName] = useState(dish.name);
  const [components, setComponents] = useState(() =>
    dish.components.map((component, index) => ({
      key: `edit-component-${index}`,
      id: component.id,
      name: component.name,
      grams: component.grams,
      sourceUrl: component.sourceUrl,
      per100: component.per100,
      macros: component.macros || (component.per100 ? scaleMacros(component.per100, component.grams) : null),
    })),
  );

  function updateComponentName(index, value) {
    setComponents((previous) => previous.map((component, itemIndex) => (
      itemIndex === index ? { ...component, name: value } : component
    )));
  }

  function updateComponentGrams(index, value) {
    setComponents((previous) => previous.map((component, itemIndex) => {
      if (itemIndex !== index) return component;
      const grams = toGrams(value);
      return {
        ...component,
        grams,
        macros: component.per100 ? scaleMacros(component.per100, grams) : component.macros,
      };
    }));
  }

  function removeComponent(index) {
    setComponents((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  }

  function addComponent(product, grams) {
    setComponents((previous) => [
      ...previous,
      { key: `edit-component-${previous.length}-${Date.now()}`, ...componentFromProduct(product, grams) },
    ]);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim() || components.length === 0) return;
    onSave(dishToPayload(name.trim(), components));
  }

  const totals = computeTotals(components);

  return (
    <form className="dish-editor" onSubmit={handleSubmit}>
      <header className="dish-editor__header">
        <h2>Редактирование блюда</h2>
      </header>

      <label className="dish-editor__field-label" htmlFor="dish-name">Название блюда</label>
      <input
        id="dish-name"
        className="dish-editor__name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Название блюда"
      />

      <div className="dish-editor__section">
        <div className="dish-editor__section-title">Компоненты ({components.length})</div>
        {components.length === 0 && (
          <p className="dish-editor__empty">Добавьте хотя бы один компонент.</p>
        )}
        {components.map((component, index) => (
          <div className="dish-editor__row" key={component.key}>
            <input
              className="dish-editor__component-name"
              type="text"
              value={component.name}
              onChange={(event) => updateComponentName(index, event.target.value)}
              aria-label="Название компонента"
            />
            <div className="dish-editor__grams">
              <input
                type="number"
                min="0"
                max="10000"
                step="1"
                value={component.grams}
                onChange={(event) => updateComponentGrams(index, event.target.value)}
                aria-label="Вес компонента в граммах"
              />
              <span>г</span>
            </div>
            <span className="dish-editor__macros">
              {component.macros ? `${formatValue(component.macros.calories)} ккал` : '—'}
            </span>
            <button
              type="button"
              className="dish-editor__remove"
              onClick={() => removeComponent(index)}
              aria-label={`Удалить компонент ${component.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="dish-editor__section dish-editor__section--add">
        <div className="dish-editor__section-title">Добавить компонент</div>
        <IngredientPicker onAdd={addComponent} addLabel="Добавить" label="Поиск продукта" />
      </div>

      <div className="dish-editor__totals">
        Итого: <strong>{formatValue(totals.calories)} ккал</strong>
        <span> · Белки {formatValue(totals.protein)} г</span>
        <span> · Жиры {formatValue(totals.fat)} г</span>
        <span> · Углеводы {formatValue(totals.carbs)} г</span>
      </div>

      <footer className="dish-editor__footer">
        <button
          className="btn-primary"
          type="submit"
          disabled={saving || !name.trim() || components.length === 0}
        >
          {saving ? 'Сохраняем…' : 'Сохранить изменения'}
        </button>
        <button className="btn-ghost" type="button" onClick={onCancel} disabled={saving}>
          Отмена
        </button>
      </footer>
    </form>
  );
}
