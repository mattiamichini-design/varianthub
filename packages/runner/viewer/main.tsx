import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VariantHubCanvasPage, VariantHubImmersivePage, VariantHubProvider, useVariantHub, type VariantHubViewportPresets, type VariantHubCatalogItem } from 'varianthub-core';
import '../../core/src/styles/varianthub.css';
import './shell.css';

type Config = {projectId:string;explorations:VariantHubCatalogItem[];viewportPresets?:Partial<VariantHubViewportPresets>};
function Viewer({config}:{config:Config}) {
  return <VariantHubProvider projectId={config.projectId} workspaceEndpoint="/api/workspace"><Workspace config={config}/></VariantHubProvider>;
}
function Workspace({config}:{config:Config}) {
  const { components, syncVariants, setActiveComponent, setResponsiveLayout } = useVariantHub();
  const [location,setLocation] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => { const update = () => setLocation(window.location.pathname + window.location.search); window.addEventListener('popstate',update); return () => window.removeEventListener('popstate',update); },[]);
  const navigate = (target:string, replace=false) => {window.history[replace ? 'replaceState':'pushState']({},'',target);setLocation(target);};
  const url = new URL(location,window.location.origin);
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const item = config.explorations.find(entry=>entry.key===parts[1]);
  useEffect(() => { if(item) { syncVariants(item.key,item.variants); setActiveComponent(item.key); } },[item,syncVariants,setActiveComponent]);
  const frameUrl = ({itemKey,variantId}:{itemKey:string;variantId:string}) => {
    const variant = config.explorations.find(entry=>entry.key===itemKey)?.variants.find(entry=>entry.id===variantId);
    if (variant?.source?.type==='url') return variant.source.url;
    if (variant?.source?.type==='html') return '/sources/'+variant.source.entry.split('/').map(encodeURIComponent).join('/');
    return 'about:blank';
  };
  const comparisonUrl = ({itemKey,variantId,sequenceVariantIds}:{itemKey:string;variantId:string;sequenceVariantIds?:string[]}) => `/preview/${encodeURIComponent(itemKey)}/${encodeURIComponent(variantId)}?${new URLSearchParams({sequence:sequenceVariantIds?.join(',')??''})}`;
  return <>
    {parts[0]==='preview' && item && parts[2] ? <VariantHubImmersivePage projectId={config.projectId} viewportPresets={config.viewportPresets} responsiveLayout={components[item.key]?.responsive?.[parts[2]]} onResponsiveLayoutChange={layout=>setResponsiveLayout(item.key,parts[2],layout)} item={item} activeVariantId={parts[2]} sequenceVariantIds={url.searchParams.get('sequence')?.split(',').filter(Boolean)} getFrameUrl={frameUrl} onNavigate={variantId=>navigate(comparisonUrl({itemKey:item.key,variantId,sequenceVariantIds:url.searchParams.get('sequence')?.split(',')}),true)} onExit={()=>navigate(`/items/${encodeURIComponent(item.key)}`)} openInNewTab={target=>window.open(frameUrl(target),'_blank','noopener,noreferrer')} /> :
    <VariantHubCanvasPage viewportPresets={config.viewportPresets} componentsWithVariants={config.explorations} activeItemKey={parts[0]==='items'?parts[1]:null} getComponentVariants={key=>config.explorations.find(item=>item.key===key)} getVariantFrameUrl={frameUrl} onCompareVariants={target=>navigate(comparisonUrl(target))} onOpenComponent={key=>navigate(`/items/${encodeURIComponent(key)}`)} onBrandClick={()=>navigate('/')} autoSelectFirstComponent={false} exportEnabled={false} title="VariantHub" />}
  </>;
}
fetch('/api/explorations').then(response=>{if(!response.ok)throw new Error('Cannot load project');return response.json();}).then(config=>createRoot(document.getElementById('root')!).render(<Viewer config={config}/>)).catch(error=>{document.getElementById('root')!.textContent=error.message;});
