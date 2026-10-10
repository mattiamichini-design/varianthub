"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  VariantHubActions,
  VariantHubComponentState,
  VariantHubState,
  VariantMeta,
} from "./types";
import { MAX_COMPARED_VARIANTS, reconcileComparedVariantIds, reconcileVariantDiscovery } from "./fullPage";

const DEFAULT_STORAGE_KEY = "varianthub-state";

const defaultComponentState: Omit<VariantHubComponentState, "componentKey"> = {
  variantOrder: [],
  selectedVariants: [],
  favoriteVariants: [],
  variantCreatedAt: {},
  variantUpdatedAt: {},
  variantSignatures: {},
  zoom: 100,
};

const defaultState: VariantHubState = {
  activeComponentKey: undefined,
  components: {},
};

export type ArtboardGeometry = {x:number; y:number; width:number; height:number};
export type CanvasLayout = {preset:"mobile"|"tablet"|"desktop"|"wide"|"custom"; resizeLocked:boolean; artboards:Record<string,ArtboardGeometry>};
export type ResponsiveLayout = {artboards:Record<string,ArtboardGeometry>};
export type SourceMetadata = {history:"git"|"no-git"|"no-head"|"unknown";lastCommit?:string;localChanges:boolean};
export type WorkspaceLayout = {version:1;variantOrder:string[];comparedVariantIds:string[];pendingVariantIds?:string[];gridCols:number;canvas?:CanvasLayout;responsive?:Record<string,ResponsiveLayout>};
type WorkspaceComponent = VariantHubComponentState & {canvas?:CanvasLayout;responsive?:Record<string,ResponsiveLayout>;camera?:{x:number;y:number;zoom:number};presentation?:"grid"|"canvas"};
type WorkspaceState = Omit<VariantHubState,"components"> & {components:Record<string,WorkspaceComponent>};
type SaveStatus = "loading"|"saving"|"saved"|"error"|"conflict";
type VariantHubContextValue = WorkspaceState & VariantHubActions & {
  projectId:string;
  sourceMetadata:Record<string,SourceMetadata>;
  metadataError:boolean;
  lastOpened:Record<string,string>;
  saveStatus:Record<string,SaveStatus>;
  saveErrors:Record<string,string>;
  refreshMetadata:()=>void;
  retrySave:(key:string)=>void;
  reloadLayout:(key:string,onlyIfClean?:boolean)=>void;
  setCanvasLayout:(key:string,layout:CanvasLayout)=>void;
  setResponsiveLayout:(key:string,variantId:string,layout:ResponsiveLayout)=>void;
  setCamera:(key:string,camera:{x:number;y:number;zoom:number})=>void;
  setPresentation:(key:string,presentation:"grid"|"canvas")=>void;
};
function visibleVariants(order:string[], saved:string[] = []):string[] {
  return reconcileComparedVariantIds(order,saved.filter(id=>order.includes(id)));
}
function sharedLayout(component:WorkspaceComponent):WorkspaceLayout {
  return {version:1,variantOrder:component.variantOrder,comparedVariantIds:visibleVariants(component.variantOrder,component.comparedVariantIds),...(component.pendingVariantIds?.length?{pendingVariantIds:component.pendingVariantIds}:{}),gridCols:component.gridCols ?? 2,...(component.canvas?{canvas:component.canvas}:{}),...(component.responsive?{responsive:component.responsive}:{})};
}

const VariantHubContext = createContext<VariantHubContextValue | undefined>(
  undefined,
);

export function normalizeVariantHubState(state: WorkspaceState): WorkspaceState {
  const ids = (value: unknown): string[] => Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
  if (!state || typeof state !== "object") return defaultState;
  return {
    activeComponentKey: state.activeComponentKey,
    components: Object.fromEntries(
      Object.entries(state.components || {}).map(
        ([componentKey, componentState]) => [
          componentKey,
          {
            componentKey,
            canvas:componentState?.canvas,
            responsive:componentState?.responsive,
            camera:componentState?.camera,
            presentation:componentState?.presentation,
            variantOrder: ids(componentState?.variantOrder),
            selectedVariants: [],
            comparedVariantIds: Array.isArray(componentState?.comparedVariantIds)
              ? ids(componentState.comparedVariantIds).slice(0, MAX_COMPARED_VARIANTS)
              : ids(componentState?.selectedVariants).length
                ? ids(componentState.selectedVariants).slice(0, MAX_COMPARED_VARIANTS)
                : undefined,
            pendingVariantIds: ids(componentState?.pendingVariantIds),
            favoriteVariants: ids(componentState?.favoriteVariants),
            variantCreatedAt: {},
            variantUpdatedAt: {},
            variantSignatures: {},
            zoom: Number.isFinite(componentState?.zoom) ? Math.min(200, Math.max(25, componentState.zoom)) : 100,
            gridCols:
              componentState?.gridCols === 1 ||
              componentState?.gridCols === 2 ||
              componentState?.gridCols === 3 ||
              componentState?.gridCols === 4
                ? componentState.gridCols
                : undefined,
          },
        ],
      ),
    ),
  };
}

function loadState(storageKey: string, legacyKey?: string): WorkspaceState {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const stored = localStorage.getItem(storageKey) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
    if (stored) {
      return normalizeVariantHubState(JSON.parse(stored) as WorkspaceState);
    }
  } catch {
    // Ignore storage and parse errors.
  }

  return defaultState;
}

function saveState(storageKey: string, state: VariantHubState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Ignore storage errors.
  }
}

export function VariantHubProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  projectId = "default",
  workspaceEndpoint,
  workspaceFetch = globalThis.fetch,
}: {
  children: ReactNode;
  storageKey?: string;
  projectId?:string;
  workspaceEndpoint?:string;
  workspaceFetch?:typeof fetch;
}) {
  const personalKey = projectId === "default" ? storageKey : `${storageKey}:${projectId}`;
  const [state, setState] = useState<WorkspaceState>(() => loadState(personalKey, personalKey !== storageKey ? storageKey : undefined));
  const [sourceMetadata,setSourceMetadata] = useState<Record<string,SourceMetadata>>({});
  const [metadataError,setMetadataError] = useState(false);
  const [lastOpened,setLastOpened] = useState<Record<string,string>>({});
  const [saveStatus,setSaveStatus] = useState<Record<string,SaveStatus>>({});
  const [saveErrors,setSaveErrors] = useState<Record<string,string>>({});
  const [epoch,setEpoch] = useState(0);
  const sessionToken = useRef("");
  const records = useRef(new Map<string,{revision:string|null;serialized:string}>());
  const loading = useRef(new Set<string>());
  const saving = useRef(new Set<string>());
  const failedSaves = useRef(new Set<string>());
  const currentState = useRef(state);
  useEffect(()=>{currentState.current=state;},[state]);
  const status = useCallback((key:string,value:SaveStatus)=>{
    if(value==="error"||value==="conflict")failedSaves.current.add(key);else failedSaves.current.delete(key);
    setSaveStatus(prev=>prev[key]===value?prev:{...prev,[key]:value});
    if(value==="saved")setSaveErrors(prev=>prev[key]?{...prev,[key]:""}:prev);
  },[]);
  const refreshMetadata = useCallback(async()=>{
    if(!workspaceEndpoint)return;
    try {
      const response=await workspaceFetch(`${workspaceEndpoint}?refresh`,{cache:"no-store"});
      if(!response.ok)throw new Error("Metadata unavailable");
      const data=await response.json();
      if(data.projectId!==projectId || typeof data.token!=="string")throw new Error("Wrong workspace");
      sessionToken.current=data.token;
      setSourceMetadata(data.metadata);setMetadataError(false);setEpoch(value=>value+1);
    }catch {setMetadataError(true);}
  },[projectId,workspaceEndpoint,workspaceFetch]);
  useEffect(()=>{
    // Hydrate browser-owned history after SSR, alongside the external metadata request.
    const hydrate = async () => {
      await refreshMetadata();
      try {setLastOpened(JSON.parse(localStorage.getItem(`${personalKey}:visits`)??"{}"));}catch{/* Personal history is optional. */}
    };
    void hydrate();
    window.addEventListener("focus",refreshMetadata);
    return ()=>window.removeEventListener("focus",refreshMetadata);
  },[personalKey,refreshMetadata]);
  const reloadLayout = useCallback(async(key:string,onlyIfClean=false)=>{
    if(!workspaceEndpoint || loading.current.has(key))return;
    const before=records.current.get(key);
    const isClean=()=>{
      const current=currentState.current.components[key];
      return !saving.current.has(key) && records.current.get(key)===before && Boolean(before && current && JSON.stringify(sharedLayout(current))===before.serialized);
    };
    if(onlyIfClean&&!isClean())return;
    loading.current.add(key);status(key,"loading");
    try {
      const response=await workspaceFetch(`${workspaceEndpoint}/${encodeURIComponent(key)}`,{cache:"no-store"});
      if(!response.ok){
        const body=await response.json().catch(()=>null);
        throw new Error(typeof body?.error === "string" ? body.error : `Cannot load the shared layout (HTTP ${response.status}).`);
      }
      const data=await response.json() as {revision:string|null;layout:WorkspaceLayout|null};
      // A host refresh must never discard an edit made while the request was in flight.
      if(onlyIfClean&&!isClean()){status(key,"saved");return;}
      records.current.set(key,{revision:data.revision,serialized:data.layout?JSON.stringify(data.layout):""});
      setState(prev=>{
        const current=prev.components[key]??{componentKey:key,...defaultComponentState};
        const available=new Set(current.variantOrder);
        const registryReady=available.size>0;
        if (!registryReady && !data.layout) return prev;
        const discovery = reconcileVariantDiscovery(
          registryReady ? current.variantOrder : data.layout!.variantOrder,
          data.layout?.variantOrder ?? current.variantOrder,
          data.layout?.comparedVariantIds ?? current.comparedVariantIds ?? [],
          data.layout?.pendingVariantIds ?? current.pendingVariantIds ?? [],
        );
        return {...prev,components:{...prev.components,[key]:{
          ...current,
          ...discovery,
          selectedVariants:current.selectedVariants.filter(id=>discovery.comparedVariantIds.includes(id)),
          gridCols:data.layout?.gridCols ?? current.gridCols,
          canvas:data.layout?.canvas ?? current.canvas,
          responsive:data.layout?.responsive ?? current.responsive,
        }}};
      });
      status(key,"saved");setEpoch(value=>value+1);
    }catch (error) {setSaveErrors(prev=>({...prev,[key]:error instanceof Error ? error.message : "Cannot reach the workspace server."}));status(key,"error");}
    finally {loading.current.delete(key);}
  },[workspaceEndpoint,workspaceFetch,status]);
  useEffect(()=>{
    const key=state.activeComponentKey;
    if(!workspaceEndpoint||!key||saveStatus[key]!=="saved")return;
    const controller=new AbortController();
    let pending=false;
    const timer=window.setInterval(async()=>{
      const record=records.current.get(key),current=currentState.current.components[key];
      if(pending||document.hidden||!record||!current||saving.current.has(key)||loading.current.has(key)||JSON.stringify(sharedLayout(current))!==record.serialized)return;
      pending=true;
      try{
        const response=await workspaceFetch(`${workspaceEndpoint}/${encodeURIComponent(key)}`,{cache:"no-store",signal:controller.signal});
        if(!response.ok)return;
        const data=await response.json();
        if(!controller.signal.aborted&&records.current.get(key)===record&&data.revision!==record.revision)void reloadLayout(key,true);
      }catch{/* Keep the existing save/retry UI responsible for connectivity failures. */}finally{pending=false;}
    },2000);
    return()=>{window.clearInterval(timer);controller.abort();};
  },[workspaceEndpoint,workspaceFetch,state.activeComponentKey,saveStatus,reloadLayout]);
  useEffect(()=>{
    if(!workspaceEndpoint)return;
    for(const key of Object.keys(state.components))if(!records.current.has(key)&&!loading.current.has(key)&&!saveStatus[key])void reloadLayout(key);
  },[state.components,workspaceEndpoint,reloadLayout,saveStatus]);
  const flush = useCallback(async(key:string,retry=false)=>{
    const record=records.current.get(key),component=currentState.current.components[key];
    if(!workspaceEndpoint||!record||!component||!sessionToken.current||saving.current.has(key)||(!retry&&failedSaves.current.has(key)))return;
    const layout=sharedLayout(component),serialized=JSON.stringify(layout);
    if(serialized===record.serialized){status(key,"saved");return;}
    saving.current.add(key);status(key,"saving");
    try {
      const response=await workspaceFetch(`${workspaceEndpoint}/${encodeURIComponent(key)}`,{method:"PUT",headers:{"Content-Type":"application/json","X-VariantHub-Token":sessionToken.current},body:JSON.stringify({revision:record.revision,layout})});
      if(!response.ok){
        const body=await response.json().catch(()=>null);
        setSaveErrors(prev=>({...prev,[key]:typeof body?.error === "string" ? body.error : `Could not save the layout (HTTP ${response.status}).`}));
        status(key,response.status===409?"conflict":"error");return;
      }
      const saved=await response.json();records.current.set(key,{revision:saved.revision,serialized});status(key,"saved");setEpoch(value=>value+1);
    }catch {setSaveErrors(prev=>({...prev,[key]:"Cannot reach the workspace server. Check that it is running and try again."}));status(key,"error");}
    finally {saving.current.delete(key);}
  },[workspaceEndpoint,workspaceFetch,status]);
  useEffect(()=>{
    if(!workspaceEndpoint)return;
    const timer=window.setTimeout(()=>{for(const key of records.current.keys())if(saveStatus[key]!=="conflict"&&saveStatus[key]!=="error"&&saveStatus[key]!=="loading")void flush(key);},250);
    return ()=>window.clearTimeout(timer);
  },[state,epoch,workspaceEndpoint,saveStatus,flush]);
  const retrySave = useCallback(async(key:string)=>{
    await refreshMetadata();
    if(records.current.has(key))await flush(key,true);else await reloadLayout(key);
  },[flush,reloadLayout,refreshMetadata]);
  const setCanvasLayout=useCallback((key:string,canvas:CanvasLayout)=>setState(prev=>({...prev,components:{...prev.components,[key]:{...(prev.components[key]??{componentKey:key,...defaultComponentState}),canvas}}})),[]);
  const setResponsiveLayout=useCallback((key:string,variantId:string,layout:ResponsiveLayout)=>setState(prev=>{const current=prev.components[key]??{componentKey:key,...defaultComponentState};return {...prev,components:{...prev.components,[key]:{...current,responsive:{...current.responsive,[variantId]:layout}}}};}),[]);
  const setCamera=useCallback((key:string,camera:{x:number;y:number;zoom:number})=>setState(prev=>({...prev,components:{...prev.components,[key]:{...(prev.components[key]??{componentKey:key,...defaultComponentState}),camera}}})),[]);
  const setPresentation=useCallback((key:string,presentation:"grid"|"canvas")=>setState(prev=>({...prev,components:{...prev.components,[key]:{...(prev.components[key]??{componentKey:key,...defaultComponentState}),presentation}}})),[]);

  useEffect(() => {
    // Keep the last browser snapshot for offline use and migration into an empty workspace.
    // A reachable workspace still replaces this cache with its authoritative shared layout.
    saveState(personalKey, state);
  }, [state, personalKey]);

  const setActiveComponent = useCallback((key: string) => {
    setLastOpened(prev=>{const next={...prev,[key]:new Date().toISOString()};try{localStorage.setItem(`${personalKey}:visits`,JSON.stringify(next));}catch{/* Browser history may be unavailable. */}return next;});
    setState((prev) => ({
      ...prev,
      activeComponentKey: key,
    }));
  }, [personalKey]);

  const clearActiveComponent = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeComponentKey: undefined,
    }));
  }, []);

  const syncVariants = useCallback(
    (componentKey: string, variants: VariantMeta[]) => {
      setState((prev) => {
        const current = prev.components[componentKey] || {
          componentKey,
          ...defaultComponentState,
        };

        const variantIds = variants.map((variant) => variant.id);
        const variantIdSet = new Set(variantIds);
        const shouldDeferDiscovery = !!workspaceEndpoint && !records.current.has(componentKey);
        const discovery = shouldDeferDiscovery
          ? { variantOrder: reconcileVariantDiscovery(variantIds,current.variantOrder,current.comparedVariantIds ?? [],current.pendingVariantIds).variantOrder, comparedVariantIds: current.comparedVariantIds, pendingVariantIds: current.pendingVariantIds }
          : reconcileVariantDiscovery(variantIds, current.variantOrder, current.comparedVariantIds ?? [], current.pendingVariantIds);
        const nextSelected = current.selectedVariants
          .filter((id) => variantIdSet.has(id))
          .slice(0, MAX_COMPARED_VARIANTS);
        const nextFavorites = current.favoriteVariants.filter((id) =>
          variantIdSet.has(id),
        );

        const nextCreatedAt: Record<string, string> = {};
        const nextUpdatedAt: Record<string, string> = {};
        const nextSignatures: Record<string, string> = {};
        for (const variant of variants) {
          const id = variant.id;
          if (variant.createdAt) nextCreatedAt[id] = variant.createdAt;
          if (variant.updatedAt) nextUpdatedAt[id] = variant.updatedAt;
        }

        return {
          ...prev,
          components: {
            ...prev.components,
            [componentKey]: {
              ...current,
              componentKey,
              variantOrder: discovery.variantOrder,
              selectedVariants: nextSelected,
              comparedVariantIds: discovery.comparedVariantIds,
              pendingVariantIds: discovery.pendingVariantIds,
              favoriteVariants: nextFavorites,
              variantCreatedAt: nextCreatedAt,
              variantUpdatedAt: nextUpdatedAt,
              variantSignatures: nextSignatures,
            },
          },
        };
      });
    },
    [workspaceEndpoint],
  );

  const setVariantOrder = useCallback(
    (componentKey: string, order: string[]) => {
      setState((prev) => ({
        ...prev,
        components: {
          ...prev.components,
          [componentKey]: {
            ...(prev.components[componentKey] || {
              componentKey,
              ...defaultComponentState,
            }),
            componentKey,
            variantOrder: order,
          },
        },
      }));
    },
    [],
  );

  const toggleVariantSelection = useCallback(
    (componentKey: string, variantId: string) => {
      setState((prev) => {
        const current = prev.components[componentKey] || {
          componentKey,
          ...defaultComponentState,
        };
        const visible = current.comparedVariantIds ?? current.variantOrder.slice(0, MAX_COMPARED_VARIANTS);
        if (!visible.includes(variantId)) return prev;
        const selection = current.selectedVariants;
        const selected = selection.includes(variantId)
          ? selection.filter((id) => id !== variantId)
          : selection.length < MAX_COMPARED_VARIANTS
            ? [...selection, variantId]
            : selection;

        return {
          ...prev,
          components: {
            ...prev.components,
            [componentKey]: {
              ...current,
              selectedVariants: selected,
            },
          },
        };
      });
    },
    [],
  );

  const setComparedVariants = useCallback(
    (componentKey: string, variantIds: string[]) => {
      setState((prev) => {
        const current = prev.components[componentKey] || {
          componentKey,
          ...defaultComponentState,
        };
        const unique = visibleVariants(current.variantOrder,variantIds);
        return {
          ...prev,
          components: {
            ...prev.components,
            [componentKey]: { ...current, selectedVariants: current.selectedVariants.filter(id => unique.includes(id)), comparedVariantIds: unique },
          },
        };
      });
    },
    [],
  );

  const resolvePendingVariants = useCallback(
    (componentKey: string, variantIds: string[]) => {
      setState((prev) => {
        const current = prev.components[componentKey];
        if (!current) return prev;
        const comparedVariantIds = visibleVariants(current.variantOrder, variantIds);
        return {
          ...prev,
          components: {
            ...prev.components,
            [componentKey]: {
              ...current,
              comparedVariantIds,
              pendingVariantIds: [],
              selectedVariants: current.selectedVariants.filter((id) => comparedVariantIds.includes(id)),
            },
          },
        };
      });
    },
    [],
  );

  const setVariantsFavorite = useCallback(
    (componentKey: string, variantIds: string[], isFavorite: boolean) => {
      if (variantIds.length === 0) {
        return;
      }

      setState((prev) => {
        const current = prev.components[componentKey] || {
          componentKey,
          ...defaultComponentState,
        };

        const favoriteSet = new Set(current.favoriteVariants);
        for (const variantId of variantIds) {
          if (isFavorite) {
            favoriteSet.add(variantId);
          } else {
            favoriteSet.delete(variantId);
          }
        }

        return {
          ...prev,
          components: {
            ...prev.components,
            [componentKey]: {
              ...current,
              favoriteVariants: current.variantOrder.filter((id) =>
                favoriteSet.has(id),
              ),
            },
          },
        };
      });
    },
    [],
  );

  const selectAllVariants = useCallback((componentKey: string) => {
    setState((prev) => {
      const current = prev.components[componentKey] || {
        componentKey,
        ...defaultComponentState,
      };

      return {
        ...prev,
        components: {
          ...prev.components,
          [componentKey]: {
            ...current,
            selectedVariants: current.comparedVariantIds ?? current.variantOrder.slice(0, MAX_COMPARED_VARIANTS),
          },
        },
      };
    });
  }, []);

  const clearSelection = useCallback((componentKey: string) => {
    setState((prev) => {
      const current = prev.components[componentKey];
      if (!current) {
        return prev;
      }

      return {
        ...prev,
        components: {
          ...prev.components,
          [componentKey]: {
            ...current,
            selectedVariants: [],
          },
        },
      };
    });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => {
      const componentKey = prev.activeComponentKey;
      if (!componentKey) {
        return prev;
      }

      const current = prev.components[componentKey] || {
        componentKey,
        ...defaultComponentState,
      };

      return {
        ...prev,
        components: {
          ...prev.components,
          [componentKey]: {
            ...current,
            zoom,
          },
        },
      };
    });
  }, []);

  const setGridCols = useCallback((itemKey: string, cols: number) => {
    const normalizedCols = Math.min(4, Math.max(1, Math.round(cols)));
    setState((prev) => {
      const current = prev.components[itemKey] || {
        componentKey: itemKey,
        ...defaultComponentState,
      };
      return {
        ...prev,
        components: {
          ...prev.components,
          [itemKey]: { ...current, gridCols: normalizedCols },
        },
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  const value = useMemo<VariantHubContextValue>(
    () => ({
      ...state,
      projectId,sourceMetadata,metadataError,lastOpened,saveStatus,saveErrors,refreshMetadata,retrySave,reloadLayout,setCanvasLayout,setResponsiveLayout,setCamera,setPresentation,
      setActiveComponent,
      clearActiveComponent,
      syncVariants,
      setVariantOrder,
      toggleVariantSelection,
      setComparedVariants,
      resolvePendingVariants,
      setVariantsFavorite,
      selectAllVariants,
      clearSelection,
      setZoom,
      setGridCols,
      reset,
    }),
    [
      projectId,sourceMetadata,metadataError,lastOpened,saveStatus,saveErrors,refreshMetadata,retrySave,reloadLayout,setCanvasLayout,setResponsiveLayout,setCamera,setPresentation,
      clearSelection,
      clearActiveComponent,
      reset,
      selectAllVariants,
      setActiveComponent,
      setVariantOrder,
      setVariantsFavorite,
      setZoom,
      setGridCols,
      state,
      syncVariants,
      toggleVariantSelection,
      setComparedVariants,
      resolvePendingVariants,
    ],
  );

  return (
    <VariantHubContext.Provider value={value}>
      {children}
    </VariantHubContext.Provider>
  );
}

export function useVariantHub() {
  const ctx = useContext(VariantHubContext);
  if (!ctx) {
    throw new Error("useVariantHub must be used within VariantHubProvider");
  }

  return ctx;
}

export function useVariantHubComponent(componentKey: string) {
  const ctx = useVariantHub();
  const componentState = ctx.components[componentKey] || {
    componentKey,
    ...defaultComponentState,
  };

  return {
    ...componentState,
    syncVariants: (variants: VariantMeta[]) =>
      ctx.syncVariants(componentKey, variants),
    setVariantOrder: (order: string[]) =>
      ctx.setVariantOrder(componentKey, order),
    toggleVariantSelection: (variantId: string) =>
      ctx.toggleVariantSelection(componentKey, variantId),
    setVariantsFavorite: (variantIds: string[], isFavorite: boolean) =>
      ctx.setVariantsFavorite(componentKey, variantIds, isFavorite),
    selectAllVariants: () => ctx.selectAllVariants(componentKey),
    clearSelection: () => ctx.clearSelection(componentKey),
    setGridCols: (cols: number) => ctx.setGridCols(componentKey, cols),
  };
}
