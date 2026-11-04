import { useState } from 'react';
import { formatValue } from './format.js';
import { CATALOG_PAGE_SIZE, useCatalog } from './useCatalog.js';

function formatMacro(value) {
  return value == null ? '—' : formatValue(value);
}

function isFitAuditUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (
      url.hostname === 'fitaudit.ru' || url.hostname === 'www.fitaudit.ru'
    );
  } catch {
    return false;
  }
}

export default function CatalogPage() {
  const {
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
  } = useCatalog();
  const [searchText, setSearchText] = useState('');

  function submitSearch(event) {
    event.preventDefault();
    handleSearch(searchText);
  }

  function clearSearch() {
    setSearchText('');
    handleSearch('');
  }

  const firstItem = total === 0 ? 0 : page * CATALOG_PAGE_SIZE + 1;
  const lastItem = Math.min((page + 1) * CATALOG_PAGE_SIZE, total);

  return (
    <section className="catalog-page">
      <header className="catalog-header">
        <div className="dish-builder__eyebrow"><span /> БАЗА ПРОДУКТОВ</div>
        <h1>Каталог продуктов</h1>
        <p>
          Продукты, сохранённые в базе данных приложения. Показатели калорийности,
          белков, жиров и углеводов приведены на 100 г.
        </p>
      </header>

      <form className="catalog-search" onSubmit={submitSearch}>
        <label htmlFor="catalog-search-input">Поиск по названию продукта</label>
        <div className="catalog-search__control">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
            <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            id="catalog-search-input"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Например, кефир"
          />
          {searchText && (
            <button
              className="catalog-search__clear"
              type="button"
              onClick={clearSearch}
              aria-label="Очистить поиск"
            >
              ×
            </button>
          )}
          <button className="catalog-search__submit" type="submit" disabled={loading}>
            Найти
          </button>
        </div>
      </form>

      <section className="catalog-results" aria-live="polite">
        <div className="catalog-results__header">
          <span>{query ? <>Результаты поиска: <strong>{query}</strong></> : 'Все продукты'}</span>
          <span>{total.toLocaleString('ru-RU')} записей</span>
        </div>

        {loading && (
          <div className="loading-state">
            <span className="spinner" />
            <span>Загружаем продукты из базы данных…</span>
          </div>
        )}

        {!loading && error && (
          <div className="error-state" role="alert">
            <strong>Не удалось загрузить каталог</strong>
            <span>{error}</span>
            <button type="button" onClick={reload}>Повторить запрос</button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty-state catalog-empty">
            <div className="empty-state__illustration" aria-hidden="true">
              <span className="plate plate--outer" />
              <span className="plate plate--inner" />
              <span className="plate__leaf">⌕</span>
            </div>
            <div className="empty-state__title">
              {query ? 'Ничего не найдено' : 'В базе пока нет продуктов'}
            </div>
            <p>
              {query
                ? 'Измените поисковый запрос и попробуйте ещё раз.'
                : 'Сначала заполните базу данных: docker compose exec fitaudit node server/importCatalog.js'}
            </p>
            {query && (
              <button className="catalog-reset" type="button" onClick={clearSearch}>
                Показать все продукты
              </button>
            )}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="catalog-table-wrap">
              <table className="catalog-table">
                <caption className="visually-hidden">Пищевая ценность продуктов на 100 граммов</caption>
                <thead>
                  <tr>
                    <th scope="col">Продукт</th>
                    <th scope="col">Ккал</th>
                    <th scope="col">Белки, г</th>
                    <th scope="col">Жиры, г</th>
                    <th scope="col">Углеводы, г</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => (
                    <tr key={product.id}>
                      <td className="catalog-table__product">
                        {isFitAuditUrl(product.sourceUrl) ? (
                          <a href={product.sourceUrl} target="_blank" rel="noreferrer">
                            {product.name || 'Без названия'}
                            <span aria-hidden="true"> ↗</span>
                          </a>
                        ) : (
                          <span>{product.name || 'Без названия'}</span>
                        )}
                        <small>ID: {product.id}</small>
                      </td>
                      <td>{formatMacro(product.calories)}</td>
                      <td>{formatMacro(product.protein)}</td>
                      <td>{formatMacro(product.fat)}</td>
                      <td>{formatMacro(product.carbs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="catalog-pagination">
              <span className="catalog-pagination__range">
                Показаны {firstItem}–{lastItem} из {total}
              </span>
              <div className="catalog-pagination__controls" aria-label="Страницы каталога">
                <button
                  type="button"
                  className="catalog-pagination__button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 0 || loading}
                >
                  ← Назад
                </button>
                <span className="catalog-pagination__current">
                  Страница {page + 1} из {totalPages}
                </span>
                <button
                  type="button"
                  className="catalog-pagination__button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages - 1 || loading}
                >
                  Вперёд →
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      <footer className="page-footer">
        <span>Источник пищевой ценности: <a href="https://fitaudit.ru/" target="_blank" rel="noreferrer">FitAudit</a></span>
        <span>Данные отображаются из MongoDB и загружаются постранично.</span>
      </footer>
    </section>
  );
}
