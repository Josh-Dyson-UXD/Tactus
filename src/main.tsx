import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './app/App';
import './styles/index.css';

// Keep the safe design lab available locally, never in a production build.
const HomePreview = import.meta.env.DEV ? lazy(() => import('./preview/HomePreview')) : null;
const isPreview = new URLSearchParams(window.location.search).get('design') === 'home-now';
createRoot(document.getElementById('root')!).render(
  HomePreview && isPreview
    ? <Suspense fallback={<p>Opening design preview…</p>}><HomePreview /></Suspense>
    : <App />,
);
