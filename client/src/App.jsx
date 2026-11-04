import { useEffect, useState } from 'react';
import Topbar from './Topbar.jsx';
import HomePage from './HomePage.jsx';
import FavoritesPage from './FavoritesPage.jsx';

function readRoute() {
  return window.location.hash.replace(/^#\/?/, '').startsWith('favorites') ? 'favorites' : 'home';
}

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  function navigate(nextRoute) {
    window.location.hash = nextRoute === 'favorites' ? '/favorites' : '/';
    setRoute(readRoute());
  }

  return (
    <main className="page-shell">
      <Topbar
        route={route}
        onHome={() => navigate('home')}
        onFavorites={() => navigate('favorites')}
      />
      {route === 'favorites' ? <FavoritesPage /> : <HomePage />}
    </main>
  );
}
