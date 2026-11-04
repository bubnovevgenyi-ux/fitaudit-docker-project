import { useState } from 'react';
import { useDishes } from './useDishes.js';
import DishCard from './DishCard.jsx';
import DishEditor from './DishEditor.jsx';

export default function FavoritesPage() {
  const { dishes, loading, error, reload, removeDish, saveDish } = useDishes();
  const [editingId, setEditingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [actionError, setActionError] = useState('');

  async function handleSave(id, payload) {
    setSavingId(id);
    setActionError('');
    try {
      await saveDish(id, payload);
      setEditingId(null);
    } catch (requestError) {
      setActionError(requestError.message || 'Не удалось обновить блюдо.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemove(id) {
    setActionError('');
    try {
      await removeDish(id);
      if (editingId === id) setEditingId(null);
    } catch (requestError) {
      setActionError(requestError.message || 'Не удалось удалить блюдо.');
    }
  }

  const editingDish = editingId ? dishes.find((dish) => dish.id === editingId) : null;

  return (
    <section className="favorites">
      <header className="favorites__header">
        <div className="dish-builder__eyebrow"><span /> ЛЮБИМЫЕ БЛЮДА</div>
        <h1>Ваши любимые блюда</h1>
        <p>
          Сохранённые рецепты с расчётом КБЖУ. Редактируйте название и компоненты
          или удаляйте ненужные блюда.
        </p>
      </header>

      {loading && (
        <div className="loading-state">
          <span className="spinner" />
          <span>Загружаем любимые блюда…</span>
        </div>
      )}

      {!loading && error && (
        <div className="error-state" role="alert">
          <strong>Не удалось загрузить блюда</strong>
          <span>{error}</span>
          <button type="button" onClick={reload}>Повторить запрос</button>
        </div>
      )}

      {!loading && !error && dishes.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__illustration" aria-hidden="true">
            <span className="plate plate--outer" />
            <span className="plate plate--inner" />
            <span className="plate__leaf">♥</span>
          </div>
          <div className="empty-state__title">Пока нет любимых блюд</div>
          <p>Соберите блюдо в калькуляторе и нажмите «Сохранить», чтобы оно появилось здесь.</p>
        </div>
      )}

      {!loading && !error && dishes.length > 0 && (
        <div className="favorites__list">
          {actionError && (
            <div className="action-error" role="alert">{actionError}</div>
          )}
          {dishes.map((dish) => (
            editingId === dish.id && editingDish ? (
              <DishEditor
                key={dish.id}
                dish={editingDish}
                saving={savingId === dish.id}
                onSave={(payload) => handleSave(dish.id, payload)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <DishCard
                key={dish.id}
                dish={dish}
                onEdit={() => setEditingId(dish.id)}
                onDelete={() => handleRemove(dish.id)}
              />
            )
          ))}
        </div>
      )}
    </section>
  );
}
