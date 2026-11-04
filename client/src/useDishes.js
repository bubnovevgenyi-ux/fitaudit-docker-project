import { useCallback, useEffect, useState } from 'react';
import { listDishes, deleteDish, updateDish } from './api.js';

export function useDishes() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listDishes();
      setDishes(data.items || []);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось загрузить любимые блюда.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function removeDish(id) {
    await deleteDish(id);
    setDishes((previous) => previous.filter((dish) => dish.id !== id));
  }

  async function saveDish(id, payload) {
    const updated = await updateDish(id, payload);
    setDishes((previous) => previous.map((dish) => (dish.id === id ? updated : dish)));
    return updated;
  }

  return { dishes, loading, error, reload, removeDish, saveDish };
}
