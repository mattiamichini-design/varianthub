import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  VariantHubProvider, VariantHubCanvasPage, VariantHubImmersivePage,
  VariantHubVariantRenderer, VariantHubPreviewBridge, useVariantHub,
  type VariantHubCatalogItem,
} from 'varianthub-core';
import 'varianthub-core/styles.css';
import './style.css';

function Counter() {
  const [count, setCount] = useState(0);
  return <main className="example"><h1>React counter</h1><label>Project note <input /></label>
    <button onClick={() => setCount(count + 1)}>Count {count}</button><a href="/source/quiet?details=1">Details</a>
    {location.search.includes('details=1') && <h2>React details</h2>}</main>;
}
function Alternate() { return <section className="alternate"><Counter /></section>; }
const item: VariantHubCatalogItem = {
  key: 'counter', name: 'Counter exploration', path: 'main.tsx', sourcePaths: ['main.tsx'],
  variants: [
    { id: 'quiet', name: 'Quiet counter', source: { type: 'react', component: Counter } },
    { id: 'bold', name: 'Bold counter', source: { type: 'react', component: Alternate } },
  ],
};
const frameUrl = ({ variantId }: { variantId: string }) => `/source/${encodeURIComponent(variantId)}`;

function Workspace() {
  const [route, setRoute] = useState(location.pathname);
  const { syncVariants, components, setResponsiveLayout } = useVariantHub();
  useEffect(() => { syncVariants(item.key, item.variants); }, [syncVariants]);
  useEffect(() => {
    const update = () => setRoute(location.pathname);
    addEventListener('popstate', update);
    return () => removeEventListener('popstate', update);
  }, []);
  const navigate = (target: string) => { history.pushState({}, '', target); setRoute(target); };
  const variantId = route.split('/')[2];
  if (route.startsWith('/preview/') && item.variants.some(v => v.id === variantId)) {
    return <VariantHubImmersivePage projectId="packed-react" item={item} activeVariantId={variantId}
      sequenceVariantIds={item.variants.map(v => v.id)} getFrameUrl={frameUrl}
      responsiveLayout={components.counter?.responsive?.[variantId]}
      onResponsiveLayoutChange={layout => setResponsiveLayout(item.key, variantId, layout)}
      onNavigate={id => navigate(`/preview/${id}`)} onExit={() => navigate('/items/counter')}
      openInNewTab={target => window.open(frameUrl(target), '_blank', 'noopener,noreferrer')} />;
  }
  return <VariantHubCanvasPage title="Consumer workspace" componentsWithVariants={[item]}
    activeItemKey={route === '/items/counter' ? item.key : null} autoSelectFirstComponent={false}
    getComponentVariants={key => key === item.key ? item : undefined} getVariantFrameUrl={frameUrl}
    onOpenComponent={() => navigate('/items/counter')} onBrandClick={() => navigate('/')}
    onCompareVariants={({ variantId }) => navigate(`/preview/${variantId}`)} exportEnabled={false} />;
}

const sourceId = location.pathname.startsWith('/source/') ? location.pathname.split('/')[2] : null;
createRoot(document.getElementById('root')!).render(sourceId
  ? <><VariantHubPreviewBridge itemKey={item.key} variantId={sourceId} /><VariantHubVariantRenderer item={item} variantId={sourceId} /></>
  : <VariantHubProvider projectId="packed-react" workspaceEndpoint="/api/workspace"><Workspace /></VariantHubProvider>);
