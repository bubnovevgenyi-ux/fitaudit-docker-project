import { useState } from 'react';
import { useProductLookup } from './useProductLookup.js';
import MacroCard from './MacroCard.jsx';
import DishBuilder from './DishBuilder.jsx';
import { formatValue, scaleMacros, toGrams } from './format.js';

export default function HomePage() {
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
  } = useProductLookup();

  const [portion, setPortion] = useState('100');

  function handleSubmit(event) {
    event.preventDefault();
    if (matches.length > 0) chooseProduct(matches[0]);
  }

  const numericPortion = toGrams(portion);
  const scaled = product ? scaleMacros(product, numericPortion) : null;

  return (
    <>
      <section className="hero">
        <div className="hero__eyebrow"><span /> ДАННЫЕ FITAUDIT</div>
        <h1>Знай, что<br /><em>на твоей тарелке.</em></h1>
        <p className="hero__text">
          Найдите продукт и получите калорийность, КБЖУ и содержание клетчатки. Значения можно пересчитать
          под фактический вес порции.
        </p>

        <div className="search-panel">
          <form className="search-form" onSubmit={handleSubmit} autoComplete="off">
            <label className="search-form__label" htmlFor="product-search">Название продукта</label>
            <div className="search-form__control">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
                <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                id="product-search"
                type="search"
                value={query}
                onChange={handleQueryChange}
                placeholder="Например, куриная грудка"
                aria-label="Название продукта"
                aria-autocomplete="list"
                aria-controls="product-suggestions"
              />
              {query && (
                <button
                  className="clear-button"
                  type="button"
                  aria-label="Очистить поиск"
                  onClick={() => handleQueryChange({ target: { value: '' } })}
                >
                  ×
                </button>
              )}
              <button className="search-submit" type="submit" disabled={!query.trim()}>
                Найти
              </button>
            </div>

            {(matches.length > 0 || isSearching || searchError || (query.trim().length >= 2 && !selection && !isSearching)) && (
              <div className="suggestions" id="product-suggestions" role="listbox">
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
          </form>
          <div className="search-panel__hint">
            <span className="hint-dot" /> Поиск по каталогу продуктов FitAudit
          </div>
        </div>
      </section>

      <section className="result-section" aria-live="polite">
        {isLoadingProduct && (
          <div className="loading-state">
            <span className="spinner" />
            <span>Загружаем пищевую ценность…</span>
          </div>
        )}

        {error && (
          <div className="error-state" role="alert">
            <strong>Не удалось загрузить продукт</strong>
            <span>{error}</span>
            <button type="button" onClick={() => selection && chooseProduct(selection)}>Повторить запрос</button>
          </div>
        )}

        {product && scaled && (
          <div className="result-card">
            <div className="result-card__header">
              <div>
                <div className="result-card__eyebrow">ПИЩЕВАЯ ЦЕННОСТЬ</div>
                <h2>{product.name}</h2>
                <a className="source-link" href={product.sourceUrl} target="_blank" rel="noreferrer">
                  Открыть карточку на FitAudit <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div className="result-card__tag">На 100 г в источнике</div>
            </div>

            <div className="portion-row">
              <div>
                <label htmlFor="portion-weight">Вес порции</label>
                <p>Измените вес, чтобы пересчитать значения</p>
              </div>
              <div className="portion-input-wrap">
                <input
                  id="portion-weight"
                  type="number"
                  min="0"
                  max="10000"
                  step="1"
                  value={portion}
                  onChange={(event) => setPortion(event.target.value)}
                  aria-label="Вес порции в граммах"
                />
                <span>г</span>
              </div>
            </div>

            <div className="macro-grid">
              <MacroCard
                label="Калорийность"
                value={scaled.calories}
                unit="ккал"
                tone="calories"
                description="Энергетическая ценность"
              />
              <MacroCard label="Белки" value={scaled.protein} unit="г" tone="protein" description="Строительный материал" />
              <MacroCard label="Жиры" value={scaled.fat} unit="г" tone="fat" description="Источник энергии" />
              <MacroCard label="Углеводы" value={scaled.carbs} unit="г" tone="carbs" description="Основной источник энергии" />
              <MacroCard label="Клетчатка" value={scaled.fiber} unit="г" tone="fiber" description="Пищевые волокна" />
            </div>
            <div className="result-card__footer">
              Расчёт для {formatValue(numericPortion)} г. Исходные показатели получены с FitAudit и указаны на 100 г продукта.
            </div>
          </div>
        )}

        {!product && !isLoadingProduct && !error && (
          <div className="empty-state">
            <div className="empty-state__illustration" aria-hidden="true">
              <span className="plate plate--outer" />
              <span className="plate plate--inner" />
              <span className="plate__leaf">✳</span>
            </div>
            <div className="empty-state__title">Пищевая ценность — в одном поиске</div>
            <p>Начните вводить название продукта. Выберите подходящий вариант из каталога, чтобы увидеть КБЖУ.</p>
          </div>
        )}
      </section>

      <DishBuilder />

      <footer className="page-footer">
        <span>Источник пищевой ценности: <a href="https://fitaudit.ru/" target="_blank" rel="noreferrer">FitAudit</a></span>
        <span>Показатели справочные и могут зависеть от вида и способа приготовления продукта.</span>
      </footer>
    </>
  );
}
