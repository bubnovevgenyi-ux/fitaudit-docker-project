export default function Topbar({ route, onHome, onFavorites }) {
  return (
    <header className="topbar">
      <a className="brand" href="https://fitaudit.ru/" target="_blank" rel="noreferrer">
        <span className="brand__mark" aria-hidden="true">f</span>
        <span>food<span className="brand__muted">calc</span></span>
      </a>
      <div className="topbar__actions">
        {route === 'favorites' ? (
          <button className="topbar-nav" type="button" onClick={onHome}>← Калькулятор</button>
        ) : (
          <button className="topbar-nav topbar-nav--favorite" type="button" onClick={onFavorites}>
            ♥ Любимые блюда
          </button>
        )}
        <div className="topbar__caption">КАЛЬКУЛЯТОР ПИЩЕВОЙ ЦЕННОСТИ</div>
      </div>
    </header>
  );
}
