import { useId, useState } from 'react';
import { useProductLookup } from './useProductLookup.js';
import { formatValue, scaleMacros, toGrams } from './format.js';

/**
 * Универсальный поиск продукта с выбором веса, используемый при сборке
 * блюда и при добавлении компонента в редакторе любимых блюд.
 */
export default function IngredientPicker({
  onAdd,
  addLabel = 'Добавить',
  label = 'Компонент блюда',
  placeholder = 'Например, куриное филе',
}) {
  const {
    query,
    matches,
    selection,
    product,
    isSearching,
    isLoadingProduct,
    error,
    searchError,
    handleQueryChange,
    chooseProduct,
    setQuery,
    setSelection,
    setProduct,
    setMatches,
    setError,
    setSearchError,
  } = useProductLookup();

  const [grams, setGrams] = useState('100');
  const numericGrams = toGrams(grams);
  const preview = product ? scaleMacros(product, numericGrams) : null;

  const inputId = useId();
  const listId = useId();

  function resetLookup() {
    setQuery('');
    setSelection(null);
    setProduct(null);
    setMatches([]);
    setError('');
    setSearchError('');
  }

  function add() {
    if (!product) return;
    onAdd(product, numericGrams);
    setGrams('100');
    resetLookup();
  }

  function submitPick() {
    if (product) add();
    else if (matches.length > 0) chooseProduct(matches[0]);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitPick();
    }
  }

  return (
    <div className="ingredient-picker">
      <div className="ingredient-picker__control">
        <div className="dish-form">
          <label className="dish-form__label" htmlFor={inputId}>{label}</label>
        <div className="dish-form__row">
          <div className="dish-form__control">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
              <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              id={inputId}
              type="search"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label={label}
              aria-autocomplete="list"
              aria-controls={listId}
            />
            {query && (
              <button
                className="clear-button"
                type="button"
                aria-label="Очистить поле компонента"
                onClick={() => handleQueryChange({ target: { value: '' } })}
              >
                ×
              </button>
            )}
          </div>
          <div className="dish-form__weight">
            <input
              id={`${inputId}-grams`}
              type="number"
              min="0"
              max="10000"
              step="1"
              value={grams}
              onChange={(event) => setGrams(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Вес компонента в граммах"
            />
            <span>г</span>
          </div>
          <button className="dish-form__add" type="button" onClick={submitPick} disabled={!product}>
            {addLabel}
          </button>
        </div>
      </div>

      {(matches.length > 0 || isSearching || searchError || (query.trim().length >= 2 && !selection && !isSearching)) && (
        <div className="suggestions dish-suggestions" id={listId} role="listbox">
          {isSearching && <div className="suggestions__message">Ищем в каталоге FitAudit…</div>}
          {!isSearching && searchError && <div className="suggestions__message suggestions__message--error">{searchError}</div>}
          {!isSearching && !searchError && matches.map((item) => (
            <button
              type="button"
              className="suggestion"
              key={item.id}
              role="option"
              aria-selected="false"
              onClick={() => chooseProduct(item)}
            >
              <span className="suggestion__name">{item.name}</span>
              <span className="suggestion__arrow" aria-hidden="true">↗</span>
            </button>
          ))}
          {!isSearching && !searchError && matches.length === 0 && query.trim().length >= 2 && (
            <div className="suggestions__message">Совпадений не найдено. Попробуйте изменить запрос.</div>
          )}
        </div>
      )}
      </div>

      {isLoadingProduct && (
        <div className="dish-status">
          <span className="spinner" />
          <span>Загружаем пищевую ценность компонента…</span>
        </div>
      )}

      {error && (
        <div className="dish-status dish-status--error" role="alert">
          <strong>Не удалось загрузить компонент</strong>
          <span>{error}</span>
        </div>
      )}

      {product && preview && !isLoadingProduct && (
        <div className="dish-preview">
          <div className="dish-preview__name">
            {product.name}
            <a className="source-link" href={product.sourceUrl} target="_blank" rel="noreferrer">FitAudit ↗</a>
          </div>
          <div className="dish-preview__values">
            <span>{formatValue(preview.calories)} ккал</span>
            <span>Б {formatValue(preview.protein)} г</span>
            <span>Ж {formatValue(preview.fat)} г</span>
            <span>У {formatValue(preview.carbs)} г</span>
            <span>Клетчатка {preview.fiber == null ? 'н/д' : `${formatValue(preview.fiber)} г`}</span>
          </div>
          <div className="dish-preview__hint">на {formatValue(numericGrams)} г</div>
        </div>
      )}
    </div>
  );
}
