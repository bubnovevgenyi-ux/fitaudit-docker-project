import { useEffect, useRef, useState } from 'react';
import { normalize, readJson } from './format.js';

export function useProductLookup() {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [selection, setSelection] = useState(null);
  const [product, setProduct] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const detailController = useRef(null);
  const searchController = useRef(null);
  const latestDetailRequest = useRef(0);

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2 || (selection && normalize(selection.name) === normalize(term))) {
      setMatches([]);
      setIsSearching(false);
      setSearchError('');
      return undefined;
    }

    const controller = new AbortController();
    searchController.current?.abort();
    searchController.current = controller;

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = await readJson(response);
        setMatches(data.items || []);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setMatches([]);
          setSearchError(requestError.message || 'Не удалось выполнить поиск.');
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selection]);

  useEffect(() => () => {
    searchController.current?.abort();
    detailController.current?.abort();
  }, []);

  function handleQueryChange(event) {
    setQuery(event.target.value);
    setSelection(null);
    setProduct(null);
    setError('');
    setSearchError('');
    setMatches([]);
    latestDetailRequest.current += 1;
    detailController.current?.abort();
  }

  async function chooseProduct(item) {
    const requestId = latestDetailRequest.current + 1;
    latestDetailRequest.current = requestId;
    searchController.current?.abort();
    detailController.current?.abort();

    const controller = new AbortController();
    detailController.current = controller;
    setSelection(item);
    setQuery(item.name);
    setMatches([]);
    setProduct(null);
    setError('');
    setIsLoadingProduct(true);

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(item.id)}`, {
        signal: controller.signal,
      });
      const data = await readJson(response);
      if (latestDetailRequest.current === requestId) {
        setProduct(data);
      }
    } catch (requestError) {
      if (requestError.name !== 'AbortError' && latestDetailRequest.current === requestId) {
        setError(requestError.message || 'Не удалось загрузить пищевую ценность продукта.');
      }
    } finally {
      if (latestDetailRequest.current === requestId) setIsLoadingProduct(false);
    }
  }

  return {
    query,
    setQuery,
    matches,
    selection,
    product,
    isSearching,
    isLoadingProduct,
    error,
    searchError,
    handleQueryChange,
    chooseProduct,
    setSelection,
    setProduct,
    setMatches,
    setError,
    setSearchError,
  };
}
