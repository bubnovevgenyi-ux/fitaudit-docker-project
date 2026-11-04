import { useEffect, useState } from 'react';
import Topbar from './Topbar.jsx';
import HomePage from './HomePage.jsx';
import FavoritesPage from './FavoritesPage.jsx';
import CatalogPage from './CatalogPage.jsx';
import MealPlanPage from './MealPlanPage.jsx';

function readRoute() {
  let pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  // Совместимость со старыми закладками вида /#/catalog и /#/favorites.
  if (pathname === '/' && window.location.hash.startsWith('#/')) {
    const legacyPath = window.location.hash.slice(1).split('?')[0];
    const canonicalPath = ['/catalog', '/favorites', '/meal-plan'].includes(legacyPath) ? legacyPath : '/';
    window.history.replaceState({}, '', `${canonicalPath}${window.location.search}`);
    pathname = canonicalPath;
  }

  if (pathname === '/favorites') return 'favorites';
  if (pathname === '/catalog') return 'catalog';
  if (pathname === '/meal-plan') return 'meal-plan';
  return 'home';
}

function routePath(route) {
  if (route === 'favorites') return '/favorites';
  if (route === 'catalog') return '/catalog';
  if (route === 'meal-plan') return '/meal-plan';
  return '/';
}

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  function navigate(nextRoute) {
    const nextPath = routePath(nextRoute);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setRoute(nextRoute);
  }

  return (
    <main className="page-shell">
      <Topbar
        route={route}
        onHome={() => navigate('home')}
        onFavorites={() => navigate('favorites')}
        onCatalog={() => navigate('catalog')}
        onMealPlan={() => navigate('meal-plan')}
      />
      {route === 'favorites' ? (
        <FavoritesPage />
      ) : route === 'catalog' ? (
        <CatalogPage />
      ) : route === 'meal-plan' ? (
        <MealPlanPage />
      ) : (
        <HomePage />
      )}
    </main>
  );
}
