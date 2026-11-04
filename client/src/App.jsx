import { useEffect, useState } from 'react';
import Topbar from './Topbar.jsx';
import HomePage from './HomePage.jsx';
import FavoritesPage from './FavoritesPage.jsx';
import CatalogPage from './CatalogPage.jsx';

function readRoute() {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (route === 'favorites') return 'favorites';
  if (route === 'catalog') return 'catalog';
  return 'home';
}

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  function navigate(nextRoute) {
    const hash = nextRoute === 'favorites'
      ? '/favorites'
      : nextRoute === 'catalog'
        ? '/catalog'
        : '/';
    window.location.hash = hash;
    setRoute(readRoute());
  }

  return (
    <main className="page-shell">
      <Topbar
        route={route}
        onHome={() => navigate('home')}
        onFavorites={() => navigate('favorites')}
        onCatalog={() => navigate('catalog')}
      />
      {route === 'favorites' ? (
        <FavoritesPage />
      ) : route === 'catalog' ? (
        <CatalogPage />
      ) : (
        <HomePage />
      )}
    </main>
  );
}
