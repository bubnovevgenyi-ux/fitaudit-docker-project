export default function Topbar({ route, onHome, onFavorites, onCatalog, onMealPlan, onDishBuilder }) {
  return (
    <header className="topbar">
      <a className="brand" href="https://fitaudit.ru/" target="_blank" rel="noreferrer">
        <span className="brand__mark" aria-hidden="true">f</span>
        <span>food<span className="brand__muted">calc</span></span>
      </a>
      <div className="topbar__actions">
        {route === 'home' ? (
          <>
            <button className="topbar-nav topbar-nav--catalog" type="button" onClick={onCatalog}>
              Каталог продуктов
            </button>
            <button className="topbar-nav topbar-nav--favorite" type="button" onClick={onFavorites}>
              ♥ Любимые блюда
            </button>
            <button className="topbar-nav topbar-nav--meal-plan" type="button" onClick={onMealPlan}>
              План питания
            </button>
            <button className="topbar-nav topbar-nav--dish-builder" type="button" onClick={onDishBuilder}>
              Сборка блюда
            </button>
          </>
        ) : (
          <button className="topbar-nav" type="button" onClick={onHome}>
            ← Калькулятор
          </button>
        )}
        <div className="topbar__caption">КАЛЬКУЛЯТОР ПИЩЕВОЙ ЦЕННОСТИ</div>
      </div>
    </header>
  );
}
