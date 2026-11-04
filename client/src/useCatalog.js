import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCatalog } from './api.js';

export const CATALOG_PAGE_SIZE = 20;

export function useCatalog() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));

  const load = useCallback(async (q, skip) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const data = await fetchCatalog({
        query: q,
        limit: CATALOG_PAGE_SIZE,
        skip,
      });

      // Более медленный предыдущий запрос не должен перезаписывать новую страницу.
      if (requestId !== requestIdRef.current) return;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number.isFinite(data.total) ? data.total : 0);
    } catch (requestError) {
      if (requestId === requestIdRef.current) {
        setError(requestError.message || 'Не удалось загрузить каталог.');
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query, page * CATALOG_PAGE_SIZE);
  }, [load, query, page]);

  function goToPage(nextPage) {
    setPage(Math.max(0, Math.min(nextPage, totalPages - 1)));
  }

  function handleSearch(nextQuery) {
    setQuery(nextQuery.trim());
    setPage(0);
  }

  function reload() {
    load(query, page * CATALOG_PAGE_SIZE);
  }

  return {
    items,
    total,
    page,
    totalPages,
    query,
    loading,
    error,
    goToPage,
    handleSearch,
    reload,
  };
}
