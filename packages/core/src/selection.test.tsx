import {cleanup,fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useEffect} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {VariantHubProvider,useVariantHub} from './provider';
const variants=['a','b','c'].map(id=>({id,name:id,component:()=>null}));
afterEach(cleanup);
function SelectionProbe({entries=variants}:{entries?:typeof variants}){
  const state=useVariantHub();
  const {syncVariants}=state;
  useEffect(()=>syncVariants('item',entries),[syncVariants,entries]);
  const item=state.components.item;
  return <>
    <output data-testid="visible">{(item?.comparedVariantIds??item?.variantOrder??[]).join(',')}</output>
    <output data-testid="selected">{item?.selectedVariants.join(',')}</output>
    <button onClick={()=>state.toggleVariantSelection('item','b')}>Toggle b</button>
    <button onClick={()=>state.selectAllVariants('item')}>Select all</button>
    <button onClick={()=>state.clearSelection('item')}>Clear</button>
    <button onClick={()=>state.setComparedVariants('item',['a','c'])}>Remove b from workspace</button>
  </>;
}
it('selection and clearing never remove previews, and membership changes trim only unavailable selection',()=>{
  render(<VariantHubProvider storageKey="selection-check"><SelectionProbe/></VariantHubProvider>);
  expect(screen.getByTestId('selected')).toHaveTextContent('');
  fireEvent.click(screen.getByText('Toggle b'));
  expect(screen.getByTestId('selected')).toHaveTextContent('b');
  expect(screen.getByTestId('visible')).toHaveTextContent('a,b,c');
  fireEvent.click(screen.getByText('Toggle b'));
  expect(screen.getByTestId('visible')).toHaveTextContent('a,b,c');
  fireEvent.click(screen.getByText('Select all'));
  fireEvent.click(screen.getByText('Remove b from workspace'));
  expect(screen.getByTestId('selected')).toHaveTextContent('a,c');
  fireEvent.click(screen.getByText('Clear'));
  expect(screen.getByTestId('visible')).toHaveTextContent('a,c');
  expect(screen.getByTestId('selected')).toBeEmptyDOMElement();
});

function OrderProbe(){
  const state=useVariantHub();
  const item=state.components.item;
  return <output data-testid="loaded-order">{item?.variantOrder.join(',')}|{item?.comparedVariantIds?.join(',')}</output>;
}

function SaveProbe(){
  const state=useVariantHub();
  return <><SelectionProbe/><output data-testid="save-state">{state.saveStatus.item}|{state.saveErrors.item}</output><button onClick={()=>state.retrySave('item')}>Retry save</button></>;
}

it('reports the server error and renews the session before retrying a failed save',async()=>{
  let refreshes=0;
  let writes=0;
  let savedIds:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
    if(String(input).endsWith('?refresh')){
      refreshes++;
      return Response.json({projectId:'project',token:`session-${refreshes}`,metadata:{}});
    }
    if(init?.method==='PUT'){
      writes++;
      if(writes===1)return Response.json({error:'Invalid workspace session'},{status:403});
      expect(new Headers(init.headers).get('X-VariantHub-Token')).toBe('session-2');
      savedIds=JSON.parse(String(init.body)).layout.comparedVariantIds;
      return Response.json({revision:'saved'});
    }
    return Response.json({revision:'initial',layout:{version:1,variantOrder:['a','b','c'],comparedVariantIds:['a','b','c'],gridCols:2}});
  }));
  const view=render(<VariantHubProvider storageKey="retry-check" projectId="project" workspaceEndpoint="/workspace"><SaveProbe/></VariantHubProvider>);
  try {
    await waitFor(()=>expect(screen.getByTestId('save-state')).toHaveTextContent('saved|'));
    fireEvent.click(screen.getByText('Remove b from workspace'));
    await waitFor(()=>expect(screen.getByTestId('save-state')).toHaveTextContent('error|Invalid workspace session'));
    fireEvent.click(screen.getByText('Clear'));
    await new Promise(resolve=>setTimeout(resolve,500));
    expect(writes).toBe(1);
    fireEvent.click(screen.getByText('Retry save'));
    await waitFor(()=>expect(writes).toBe(2));
    await waitFor(()=>expect(screen.getByTestId('save-state')).toHaveTextContent('saved|'));
    expect(savedIds).toEqual(['a','c']);
  } finally {
    view.unmount();
    localStorage.removeItem('retry-check:project');
    vi.unstubAllGlobals();
  }
});

it('keeps a remote order while the variant registry is not hydrated yet',async()=>{
  localStorage.setItem('remote-order-check:project',JSON.stringify({
    components:{item:{componentKey:'item',variantOrder:[],selectedVariants:[],favoriteVariants:[],variantCreatedAt:{},variantUpdatedAt:{},variantSignatures:{},zoom:100}},
  }));
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
    const url=String(input);
    return new Response(JSON.stringify(url.endsWith('?refresh')
      ? {projectId:'project',token:'token',metadata:{}}
      : {revision:'revision-1',layout:{version:1,variantOrder:['a','b','c'],comparedVariantIds:[],gridCols:2}}),{
      status:200,
      headers:{'Content-Type':'application/json'},
    });
  }));
  const view=render(<VariantHubProvider storageKey="remote-order-check" projectId="project" workspaceEndpoint="/workspace"><OrderProbe/></VariantHubProvider>);
  try {
    await waitFor(()=>expect(screen.getByTestId('loaded-order')).toHaveTextContent('a,b,c|a,b,c'),{timeout:500});
  } finally {
    view.unmount();
    localStorage.removeItem('remote-order-check:project');
    vi.unstubAllGlobals();
  }
});

const growthVariants=Array.from({length:26},(_,index)=>({id:`v${index+1}`,name:`Variant ${index+1}`,component:()=>null}));
function DiscoveryProbe(){
  const state=useVariantHub();
  const {syncVariants}=state;
  useEffect(()=>syncVariants('item',growthVariants),[syncVariants]);
  const item=state.components.item;
  return <output data-testid="discovery">{item?.comparedVariantIds?.length ?? 0}|{item?.pendingVariantIds?.join(',') ?? ''}</output>;
}

it('hydrates twenty shared variants, persists six pending additions, and restores the notice state',async()=>{
  const existing=growthVariants.slice(0,20).map(({id})=>id);
  let remote={version:1 as const,variantOrder:existing,comparedVariantIds:existing,gridCols:2,pendingVariantIds:undefined as string[]|undefined};
  let putCount=0;
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);
    if(url.endsWith('?refresh'))return new Response(JSON.stringify({projectId:'project',token:'token',metadata:{}}),{status:200,headers:{'Content-Type':'application/json'}});
    if(init?.method==='PUT'){
      remote=JSON.parse(String(init.body)).layout;
      putCount++;
      return new Response(JSON.stringify({revision:`revision-${putCount+1}`}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    return new Response(JSON.stringify({revision:`revision-${putCount+1}`,layout:remote}),{status:200,headers:{'Content-Type':'application/json'}});
  }));
  const storageKey='pending-hydration-check';
  let view=render(<VariantHubProvider storageKey={storageKey} projectId="project" workspaceEndpoint="/workspace"><DiscoveryProbe/></VariantHubProvider>);
  try {
    await waitFor(()=>expect(screen.getByTestId('discovery')).toHaveTextContent('20|v21,v22,v23,v24,v25,v26'));
    await waitFor(()=>expect(putCount).toBeGreaterThan(0));
    expect(remote.pendingVariantIds).toEqual(['v21','v22','v23','v24','v25','v26']);
    view.unmount();
    view=render(<VariantHubProvider storageKey={storageKey} projectId="project" workspaceEndpoint="/workspace"><DiscoveryProbe/></VariantHubProvider>);
    await waitFor(()=>expect(screen.getByTestId('discovery')).toHaveTextContent('20|v21,v22,v23,v24,v25,v26'));
  } finally {
    view.unmount();
    localStorage.removeItem(`${storageKey}:project`);
    vi.unstubAllGlobals();
  }
});


it.each([
  {count:3, saved:[], expected:['a','b','c']},
  {count:22, saved:[], expected:Array.from({length:20},(_,i)=>String.fromCharCode(97+i))},
  {count:12, saved:['k','l'], expected:['k','l']},
  {count:3, saved:['removed'], expected:['a','b','c']},
])('restores a useful visible workspace for $count variants with saved $saved',({count,saved,expected})=>{
  const entries=Array.from({length:count},(_,i)=>({id:String.fromCharCode(97+i),name:'Variant',component:()=>null}));
  const storageKey='visible-default-check';
  localStorage.setItem(storageKey,JSON.stringify({components:{item:{variantOrder:entries.map(v=>v.id),comparedVariantIds:saved}}}));
  const view=render(<VariantHubProvider storageKey={storageKey}><SelectionProbe entries={entries}/></VariantHubProvider>);
  try {
    expect(screen.getByTestId('visible').textContent).toBe(expected.join(','));
    expect(screen.getByTestId('selected')).toBeEmptyDOMElement();
  } finally {view.unmount();localStorage.removeItem(storageKey);}
});

function RefreshProbe(){
  const state=useVariantHub();
  const {syncVariants}=state;
  useEffect(()=>syncVariants('item',variants),[syncVariants]);
  return <>
    <output data-testid="refresh-columns">{state.components.item?.gridCols}</output>
    <output data-testid="refresh-status">{state.saveStatus.item}</output>
    <button onClick={()=>state.reloadLayout('item',true)}>Host refresh</button>
    <button onClick={()=>state.setGridCols('item',3)}>Local edit</button>
  </>;
}
it('a host refresh cannot overwrite a local edit made while its response is pending',async()=>{
  const layout={version:1,variantOrder:['a','b','c'],comparedVariantIds:['a','b','c'],gridCols:2};
  let reads=0;
  let finish:((response:Response)=>void)|undefined;
  const response=(value:unknown)=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
    if(String(input).endsWith('?refresh'))return response({projectId:'project',token:'token',metadata:{}});
    if(init?.method==='PUT')return response({revision:'local-saved'});
    if(++reads===1)return response({revision:'initial',layout});
    return new Promise<Response>(resolve=>{finish=resolve;});
  }));
  const view=render(<VariantHubProvider storageKey="host-refresh-check" projectId="project" workspaceEndpoint="/workspace"><RefreshProbe/></VariantHubProvider>);
  try{
    await waitFor(()=>expect(screen.getByTestId('refresh-status')).toHaveTextContent('saved'));
    fireEvent.click(screen.getByText('Host refresh'));
    await waitFor(()=>expect(finish).toBeDefined());
    fireEvent.click(screen.getByText('Local edit'));
    finish!(response({revision:'remote',layout:{...layout,gridCols:4}}));
    await waitFor(()=>expect(screen.getByTestId('refresh-status')).toHaveTextContent('saved'));
    expect(screen.getByTestId('refresh-columns')).toHaveTextContent('3');
  }finally{view.unmount();localStorage.removeItem('host-refresh-check:project');vi.unstubAllGlobals();}
});

function LayoutProbe({label='layout'}:{label?:string}){
  const state=useVariantHub();
  const {syncVariants}=state;
  useEffect(()=>syncVariants('item',variants),[syncVariants]);
  return <>
    <output data-testid={label}>{JSON.stringify(state.components.item)}</output>
    <output data-testid={`${label}-status`}>{state.saveStatus.item}</output>
    <button onClick={()=>state.retrySave('item')}>Retry {label}</button>
    <button onClick={()=>state.setGridCols('item',4)}>Edit {label}</button>
  </>;
}

it('migrates the complete browser layout into an empty workspace and retains it through failed saves and offline reloads',async()=>{
  const storageKey='migration-cache';
  const original={variantOrder:['c','a','b'],comparedVariantIds:['c','a'],gridCols:3,
    canvas:{preset:'custom',resizeLocked:true,artboards:{c:{x:10,y:20,width:400,height:300}}},
    responsive:{c:{artboards:{mobile:{x:0,y:0,width:320,height:600}}}}};
  localStorage.setItem(storageKey,JSON.stringify({components:{item:original}}));
  let offline=true,failSave=true;
  let saved:unknown;
  const transport:typeof fetch=vi.fn(async(input,init)=>{
    if(offline)throw new Error('offline');
    if(String(input).endsWith('?refresh'))return Response.json({projectId:'project',token:'token',metadata:{}});
    if(init?.method==='PUT'){
      if(failSave)return Response.json({error:'Unavailable'},{status:503});
      saved=JSON.parse(String(init.body)).layout;
      return Response.json({revision:'saved'});
    }
    return Response.json({revision:null,layout:null});
  });
  const mount=()=>render(<VariantHubProvider storageKey={storageKey} projectId="project" workspaceEndpoint="/workspace" workspaceFetch={transport}><LayoutProbe/></VariantHubProvider>);
  let view=mount();
  const cached=()=>JSON.parse(localStorage.getItem(`${storageKey}:project`)!).components.item;
  try{
    await waitFor(()=>expect(screen.getByTestId('layout-status')).toHaveTextContent('error'));
    expect(cached()).toMatchObject(original);
    offline=false;
    fireEvent.click(screen.getByText('Retry layout'));
    await waitFor(()=>expect(screen.getByTestId('layout-status')).toHaveTextContent('error'));
    await waitFor(()=>expect(transport).toHaveBeenCalledWith('/workspace/item',expect.objectContaining({method:'PUT'})));
    expect(cached()).toMatchObject(original);
    failSave=false;
    fireEvent.click(screen.getByText('Retry layout'));
    await waitFor(()=>expect(saved).toMatchObject(original));
    expect(cached()).toMatchObject(original);
    view.unmount();
    offline=true;
    view=mount();
    await waitFor(()=>expect(screen.getByTestId('layout-status')).toHaveTextContent('error'));
    expect(JSON.parse(screen.getByTestId('layout').textContent!)).toMatchObject(original);
  }finally{
    view.unmount();localStorage.removeItem(storageKey);localStorage.removeItem(`${storageKey}:project`);
  }
});

it('isolates two provider transports even when their API paths and component keys are identical',async()=>{
  const writes:Record<string,unknown>={};
  const transport=(projectId:string):typeof fetch=>vi.fn(async(input,init)=>{
    if(String(input).endsWith('?refresh'))return Response.json({projectId,token:projectId,metadata:{}});
    if(init?.method==='PUT'){
      expect(new Headers(init.headers).get('X-VariantHub-Token')).toBe(projectId);
      writes[projectId]=JSON.parse(String(init.body)).layout;
      return Response.json({revision:`${projectId}-saved`});
    }
    return Response.json({revision:projectId,layout:{version:1,variantOrder:['a','b','c'],comparedVariantIds:['a','b','c'],gridCols:2}});
  });
  const first=transport('first'),second=transport('second');
  const view=render(<>
    <VariantHubProvider storageKey="transport-isolation" projectId="first" workspaceEndpoint="/workspace" workspaceFetch={first}><LayoutProbe label="first"/></VariantHubProvider>
    <VariantHubProvider storageKey="transport-isolation" projectId="second" workspaceEndpoint="/workspace" workspaceFetch={second}><LayoutProbe label="second"/></VariantHubProvider>
  </>);
  try{
    await waitFor(()=>expect(screen.getByTestId('first-status')).toHaveTextContent('saved'));
    await waitFor(()=>expect(screen.getByTestId('second-status')).toHaveTextContent('saved'));
    fireEvent.click(screen.getByText('Edit first'));
    await waitFor(()=>expect(writes.first).toMatchObject({gridCols:4}));
    expect(writes.second).toBeUndefined();
    expect(JSON.parse(screen.getByTestId('second').textContent!)).toMatchObject({gridCols:2});
    fireEvent.click(screen.getByText('Edit second'));
    await waitFor(()=>expect(writes.second).toMatchObject({gridCols:4}));
    expect(first).toHaveBeenCalled();expect(second).toHaveBeenCalled();
  }finally{
    view.unmount();localStorage.removeItem('transport-isolation:first');localStorage.removeItem('transport-isolation:second');
  }
});
