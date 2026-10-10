"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Expand, PanelsTopLeft, X } from "lucide-react";
import { cn } from "./classnames";
import {
  buildVariantSequence,
  getAdjacentVariantId,
  isEditableEventTarget,
} from "./fullPage";
import { isVariantHubPreviewMessage } from "./previewProtocol";
import { VariantHubPreviewFrame } from "./VariantHubPreviewFrame";
import { resolveViewportPresets, VariantHubCanvasPrototype, type VariantHubViewportPresets } from "./VariantHubCanvasPrototype";
import type { ResponsiveLayout } from "./provider";
import { resolveVariantSource } from "./variantSource";
import type { VariantHubCatalogItem, VariantHubPageVariantTarget } from "./types";

type StoredFrameState = { href: string; scrollY: number };
type DetailMode = "immersive" | "responsive";
const DETAIL_MODE_EVENT = "varianthub-detail-mode";

export type VariantHubImmersivePageProps = {
  projectId?: string;
  item: VariantHubCatalogItem;
  activeVariantId: string;
  selectedVariantIds?: string[];
  variantOrder?: string[];
  sequenceVariantIds?: string[];
  getFrameUrl: (target: VariantHubPageVariantTarget) => string;
  onNavigate: (variantId: string) => void;
  onExit: () => void;
  openInNewTab?: (target: VariantHubPageVariantTarget) => void;
  className?: string;
  responsiveLayout?: ResponsiveLayout;
  onResponsiveLayoutChange?: (layout: ResponsiveLayout) => void;
  viewportPresets?: Partial<VariantHubViewportPresets>;
};

function storageKey(projectId: string, itemKey: string, variantId: string, instanceId = "immersive") {
  return `varianthub:${[projectId, itemKey, variantId, instanceId].map(encodeURIComponent).join(":")}:page-session`;
}

function loadFrameState(projectId: string, itemKey: string, variantId: string, instanceId = "immersive", source?: string): StoredFrameState | undefined {
  try {
    const value = sessionStorage.getItem(storageKey(projectId, itemKey, variantId, instanceId))
      ?? sessionStorage.getItem(`varianthub:page-session:${itemKey}:${variantId}:${instanceId}`);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as StoredFrameState;
    const url = new URL(parsed.href, window.location.href);
    if(typeof parsed.scrollY !== "number" || !Number.isFinite(parsed.scrollY) || parsed.scrollY < 0)return undefined;
    if(source?.startsWith("blob:") && url.protocol === "blob:") {
      // Blob handles expire on app reload; keep the anchor on the current document.
      const current=new URL(source);
      current.hash=url.hash;
      return {...parsed,href:current.href};
    }
    return url.origin === window.location.origin ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function frameUrl(source: string, projectId: string, itemKey: string, variantId: string, instanceId: string) {
  if (source.startsWith("blob:")) {
    const url = new URL(source);
    const fragment=url.hash.slice(1);
    const identity = fragment && !fragment.includes("=") ? new URLSearchParams({vhAnchor:fragment}) : new URLSearchParams(fragment);
    identity.set("vhProject", projectId);
    identity.set("vhItem", itemKey);
    identity.set("vhVariant", variantId);
    identity.set("vhInstance", instanceId);
    url.hash = identity.toString();
    return url.href;
  }
  const base = typeof window === "undefined" ? "http://varianthub.local" : window.location.href;
  const url = new URL(source, base);
  if (url.origin !== new URL(base).origin) return source;
  url.searchParams.set("vhProject", projectId);
  url.searchParams.set("vhItem", itemKey);
  url.searchParams.set("vhVariant", variantId);
  url.searchParams.set("vhInstance", instanceId);
  return source.startsWith("http://") || source.startsWith("https://")
    ? url.href
    : `${url.pathname}${url.search}${url.hash}`;
}

function detailModeKey(projectId: string, itemKey: string) {
  return `varianthub:${[projectId, itemKey].map(encodeURIComponent).join(":")}:detail-mode`;
}

function readDetailMode(key: string): DetailMode {
  try { return sessionStorage.getItem(key) === "responsive" ? "responsive" : "immersive"; }
  catch { return "immersive"; }
}

export function VariantHubImmersivePage({
  projectId = "default",
  item,
  activeVariantId,
  selectedVariantIds = [],
  variantOrder,
  sequenceVariantIds,
  getFrameUrl,
  onNavigate,
  onExit,
  className,
  responsiveLayout,
  onResponsiveLayoutChange,
  viewportPresets,
}: VariantHubImmersivePageProps) {
  const presets = resolveViewportPresets(viewportPresets);
  const registeredIds = item.variants.map((variant) => variant.id);
  const registeredSet = new Set(registeredIds);
  const visualOrder = variantOrder
    ? [...variantOrder.filter((id) => registeredSet.has(id)), ...registeredIds.filter((id) => !variantOrder.includes(id))]
    : registeredIds;
  const seenSequenceIds = new Set<string>();
  const validatedSequence = (sequenceVariantIds ?? []).filter((id) => {
    if (!registeredSet.has(id) || seenSequenceIds.has(id)) return false;
    seenSequenceIds.add(id);
    return true;
  });
  const sequence = validatedSequence.includes(activeVariantId)
    ? validatedSequence
    : buildVariantSequence(visualOrder, selectedVariantIds, activeVariantId);
  const previousId = getAdjacentVariantId(sequence, activeVariantId, -1);
  const nextId = getAdjacentVariantId(sequence, activeVariantId, 1);
  const frameIds = Array.from(
    new Set([previousId, activeVariantId, nextId].filter((id): id is string => !!id)),
  );
  const frameRefs = useRef(new Map<string, HTMLIFrameElement>());
  const [announcement, setAnnouncement] = useState("");
  const modeKey = detailModeKey(projectId, item.key);
  const detailMode = useSyncExternalStore(
    (notify) => {
      const handleChange = (event: Event) => {
        if (event instanceof CustomEvent && event.detail === modeKey) notify();
      };
      window.addEventListener(DETAIL_MODE_EVENT, handleChange);
      return () => window.removeEventListener(DETAIL_MODE_EVENT, handleChange);
    },
    () => readDetailMode(modeKey),
    () => "immersive",
  );
  const setDetailMode = (mode: DetailMode) => {
    try { sessionStorage.setItem(modeKey, mode); } catch { /* Browser storage is optional. */ }
    window.dispatchEvent(new CustomEvent(DETAIL_MODE_EVENT, { detail: modeKey }));
  };
  const activeVariant = item.variants.find((variant) => variant.id === activeVariantId);
  const activeIndex = sequence.indexOf(activeVariantId);

  const navigate = (variantId: string | undefined) => {
    if (!variantId || variantId === activeVariantId) return;
    const variant = item.variants.find((entry) => entry.id === variantId);
    setAnnouncement(variant ? `Showing ${variant.name}` : `Showing ${variantId}`);
    onNavigate(variantId);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) return;
      if (event.key === "Escape") onExit();
      if (event.key === "ArrowLeft") navigate(previousId);
      if (event.key === "ArrowRight") navigate(nextId);
    };
    const handleMessage = (event: MessageEvent) => {
      if (!isVariantHubPreviewMessage(event.data)) {
        return;
      }
      const frameEntry = Array.from(frameRefs.current.entries()).find(([, frame]) => frame.contentWindow === event.source);
      if (!frameEntry) return;
      const [frameKey, frame] = frameEntry;
      const frameLocation=new URL(frame.src,window.location.href);
      if(event.origin !== window.location.origin && !(frameLocation.protocol === "blob:" && event.origin === frameLocation.origin))return;
      const isResponsiveFrame = frameKey.startsWith("responsive:");
      const sourceId = isResponsiveFrame ? activeVariantId : frameKey;
      const instanceId = isResponsiveFrame ? frameKey.slice("responsive:".length) : "immersive";
      if (
        event.data.projectId !== projectId ||
        event.data.itemKey !== item.key ||
        event.data.variantId !== sourceId ||
        event.data.instanceId !== instanceId
      ) return;
      if (event.data.type === "shortcut") {
        if (event.data.key === "Escape") onExit();
        if (event.data.key === "ArrowLeft") navigate(previousId);
        if (event.data.key === "ArrowRight") navigate(nextId);
        return;
      }
      try {
        const href = new URL(event.data.href, window.location.href);
        const ownedBlob=frameLocation.protocol === "blob:" && href.protocol === "blob:" && href.pathname === frameLocation.pathname && href.search === frameLocation.search;
        if ((!ownedBlob && href.origin !== window.location.origin) || event.data.scrollY < 0) return;
        sessionStorage.setItem(
          storageKey(projectId, item.key, sourceId, instanceId),
          JSON.stringify({ href: event.data.href, scrollY: event.data.scrollY }),
        );
      } catch {
        // Session persistence is a progressive enhancement.
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("message", handleMessage);
    };
  });

  return (
    <div className={cn("vh-immersive", className)}>
      <header className="vh-immersive-bar">
        <div className="vh-immersive-side vh-immersive-side--left">
          <button type="button" className="vh-immersive-button" onClick={onExit} aria-label="Exit comparison">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="vh-immersive-center">
          <div className="vh-immersive-title">
            <strong>{item.name}</strong>
            <span className="vh-immersive-variant-pill">{activeVariant?.name ?? activeVariantId}</span>
            <div className="vh-immersive-navigation">
              <button type="button" className="vh-immersive-button" disabled={!previousId} onClick={() => navigate(previousId)} aria-label="Previous variant">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span>{activeIndex + 1} of {sequence.length}</span>
              <button type="button" className="vh-immersive-button" disabled={!nextId} onClick={() => navigate(nextId)} aria-label="Next variant">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="vh-immersive-side vh-immersive-side--right">
          <div className="vh-immersive-mode-switch vh-segmented" role="group" aria-label="Preview mode">
            <button type="button" aria-label="Immersive" aria-pressed={detailMode === "immersive"} className={cn("vh-immersive-button", "vh-immersive-mode-button", detailMode === "immersive" && "vh-immersive-button--active")} onClick={() => setDetailMode("immersive")}><Expand /><span>Immersive</span></button>
            <button type="button" aria-label="Responsive" aria-pressed={detailMode === "responsive"} className={cn("vh-immersive-button", "vh-immersive-mode-button", detailMode === "responsive" && "vh-immersive-button--active")} onClick={() => setDetailMode("responsive")}><PanelsTopLeft /><span>Responsive</span></button>
          </div>
        </div>
      </header>
      {detailMode === "immersive" ? <div className="vh-immersive-frames">
        {frameIds.map((variantId) => {
          const variant = item.variants.find((entry) => entry.id === variantId);
          const sourceError = variant ? resolveVariantSource(variant).error : "Variant not found.";
          const source=getFrameUrl({itemKey:item.key,variantId});
          const persisted = loadFrameState(projectId, item.key, variantId,"immersive",source);
          if (sourceError) return <div key={variantId} className={cn("vh-immersive-frame", "vh-source-error", variantId === activeVariantId && "vh-immersive-frame--active")} role="alert">{sourceError}</div>;
          return (
            <VariantHubPreviewFrame
              key={variantId}
              onFrameRef={(node) => {
                if (node) frameRefs.current.set(variantId, node);
                else frameRefs.current.delete(variantId);
              }}
              className={cn("vh-immersive-frame", variantId === activeVariantId && "vh-immersive-frame--active")}
              src={frameUrl(persisted?.href ?? source, projectId, item.key, variantId, "immersive")}
              title={`${item.name} — ${variant?.name ?? variantId}`}
              variantId={variantId}
              instanceId="immersive"
              onLoad={(frame) => {
                if (persisted?.scrollY) {
                  try { frame.contentWindow?.scrollTo(0, persisted.scrollY); } catch { /* same-origin may not be ready */ }
                }
              }}
            />
          );
        })}
      </div> : (
        <div className="vh-responsive-detail">
          <div className="vh-responsive-detail-copy"><span>4 viewport previews</span><span>Mobile · Tablet · Desktop · Wide</span></div>
          <VariantHubCanvasPrototype
            key={`${item.key}:${activeVariantId}:responsive`}
            artboards={[
              ["mobile", "Mobile"], ["tablet", "Tablet"], ["desktop", "Desktop"], ["wide", "Wide"],
            ].map(([instanceId, name]) => {const source=getFrameUrl({itemKey:item.key,variantId:activeVariantId});return {id:instanceId,instanceId,variantId:activeVariantId,name,width:presets[instanceId as keyof typeof presets].width,height:presets[instanceId as keyof typeof presets].height,error:activeVariant ? resolveVariantSource(activeVariant).error : "Variant not found.",src:frameUrl(loadFrameState(projectId,item.key,activeVariantId,instanceId,source)?.href ?? source,projectId,item.key,activeVariantId,instanceId)};})}
            initialLayout={responsiveLayout?.artboards}
            onLayoutChange={(artboards) => onResponsiveLayoutChange?.({artboards})}
            onFrameRef={(instanceId, frame) => {
              if (frame) frameRefs.current.set(`responsive:${instanceId}`, frame);
              else frameRefs.current.delete(`responsive:${instanceId}`);
            }}
            onFrameLoad={(instanceId, frame) => {
              const persisted = loadFrameState(projectId, item.key, activeVariantId, instanceId,getFrameUrl({itemKey:item.key,variantId:activeVariantId}));
              if (persisted?.scrollY) try { frame.contentWindow?.scrollTo(0, persisted.scrollY); } catch { /* Cross-origin frames do not expose scroll state. */ }
            }}
          />
        </div>
      )}
      <span className="vh-sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
