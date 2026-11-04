import { useState, useEffect, useCallback } from 'react';
import { fetchCatalog } from './api.js';

const PAGE_SIZE = 20;

export function useCatalog() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (q, skip) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCatalog({ query: q, limit: PAGE_SIZE, skip });
      setItems(data.items);
      setTotal(data.total);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось загрузить каталог.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query, page * PAGE_SIZE);
  }, [load, query, page]);

  function goToPage(nextPage) {
    setPage(Math.max(0, Math.min(nextPage, totalPages - 1)));
  }

  function handleSearch(nextQuery) {
    setQuery(nextQuery);
    setPage(0);
  }

  function reload() {
    load(query, page * PAGE_SIZE);
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