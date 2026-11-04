import { formatValue } from './format.js';

function formatFiber(value) {
  return value == null ? 'н/д' : `${formatValue(value)} г`;
}

export default function DishCard({ dish, onEdit, onDelete }) {
  return (
    <article className="favorite-card">
      <header className="favorite-card__header">
        <div className="favorite-card__heading">
          <h2 className="favorite-card__title">{dish.name}</h2>
          <span className="favorite-card__count">
            {dish.components.length} {dish.components.length === 1 ? 'компонент' : 'компонентов'}
          </span>
        </div>
        <div className="favorite-card__actions">
          <button className="btn-edit" type="button" onClick={onEdit}>Редактировать</button>
          <button className="btn-delete" type="button" onClick={onDelete} aria-label={`Удалить блюдо ${dish.name}`}>
            Удалить
          </button>
        </div>
      </header>

      <div className="favorite-card__totals">
        <span className="favorite-card__total-label">Итого</span>
        <div className="favorite-card__total-values">
          <span>{formatValue(dish.totals.calories)} <em>ккал</em></span>
          <span>Белки {formatValue(dish.totals.protein)} г</span>
          <span>Жиры {formatValue(dish.totals.fat)} г</span>
          <span>Углеводы {formatValue(dish.totals.carbs)} г</span>
          <span>Клетчатка {formatFiber(dish.totals.fiber)}</span>
        </div>
      </div>

      <ul className="favorite-card__components">
        {dish.components.map((component, index) => (
          <li className="favorite-item" key={`${component.id || index}-${index}`}>
            <div className="favorite-item__name">
              {component.name}
              <span className="favorite-item__grams">{formatValue(component.grams)} г</span>
            </div>
            <div className="favorite-item__macros">
              <span>{formatValue(component.macros?.calories)} ккал</span>
              <span>Б {formatValue(component.macros?.protein)}</span>
              <span>Ж {formatValue(component.macros?.fat)}</span>
              <span>У {formatValue(component.macros?.carbs)}</span>
              <span>Клетчатка {formatFiber(component.macros?.fiber)}</span>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
