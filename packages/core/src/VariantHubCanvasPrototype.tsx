"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  NodeResizer,
  Panel,
  ReactFlow,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import { AlignHorizontalDistributeCenter, Focus, Hand, Maximize, Minus, RotateCcw, Plus } from "lucide-react";
import { VariantHubPreviewFrame } from "./VariantHubPreviewFrame";

export type VariantHubCanvasGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VariantHubViewportPresetName = "mobile" | "tablet" | "desktop" | "wide";
export type VariantHubViewportPresets = Record<VariantHubViewportPresetName, { width: number; height: number }>;
export const DEFAULT_VIEWPORT_PRESETS: VariantHubViewportPresets = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
};

export function resolveViewportPresets(input?: Partial<VariantHubViewportPresets>): VariantHubViewportPresets {
  return Object.fromEntries(Object.entries(DEFAULT_VIEWPORT_PRESETS).map(([name, fallback]) => {
    const candidate = input?.[name as VariantHubViewportPresetName];
    const valid = candidate && Number.isFinite(candidate.width) && Number.isFinite(candidate.height)
      && candidate.width >= 100 && candidate.width <= 7680 && candidate.height >= 100 && candidate.height <= 7680;
    return [name, valid ? candidate : fallback];
  })) as VariantHubViewportPresets;
}

export type VariantHubCanvasArtboard = {
  id: string;
  instanceId?: string;
  variantId?: string;
  name: string;
  src: string;
  width: number;
  height: number;
  error?: string;
};

type CanvasNodeData = VariantHubCanvasArtboard & {
  resizeLocked: boolean;
  handActive: boolean;
  onSizeChange?: (id: string, width: number, height: number) => void;
  onFrameRef?: (instanceId: string, frame: HTMLIFrameElement | null) => void;
  onFrameLoad?: (instanceId: string, frame: HTMLIFrameElement) => void;
  onOpenArtboard?: (id: string) => void;
};

type CanvasNode = Node<CanvasNodeData, "artboard">;

export type VariantHubCanvasPrototypeProps = {
  artboards: VariantHubCanvasArtboard[];
  initialLayout?: Record<string, VariantHubCanvasGeometry>;
  resizeLocked?: boolean;
  className?: string;
  onLayoutChange?: (layout: Record<string, VariantHubCanvasGeometry>) => void;
  onFrameRef?: (instanceId: string, frame: HTMLIFrameElement | null) => void;
  onFrameLoad?: (instanceId: string, frame: HTMLIFrameElement) => void;
  onOpenArtboard?: (id: string) => void;
  initialViewport?: Viewport;
  onViewportChange?: (viewport: Viewport) => void;
};

const ARTBOARD_HEADER_HEIGHT = 38;
const PREVIEW_ACTIONS_HEIGHT = 36;
const ARTBOARD_CHROME_HEIGHT = ARTBOARD_HEADER_HEIGHT + PREVIEW_ACTIONS_HEIGHT;
const ARTBOARD_GAP = 80;

function defaultPositions(artboards: VariantHubCanvasArtboard[]) {
  let x = 0;
  return artboards.map((artboard) => {
    const position = { x, y: 0 };
    x += artboard.width + ARTBOARD_GAP;
    return position;
  });
}

function nodesToLayout(nodes: CanvasNode[]) {
  return Object.fromEntries(nodes.map((node) => [
    node.id,
    {
      x: node.position.x,
      y: node.position.y,
      width: node.measured?.width ?? node.width ?? node.data.width,
      height: Math.max(0, (node.measured?.height ?? node.height ?? node.data.height + ARTBOARD_CHROME_HEIGHT) - ARTBOARD_CHROME_HEIGHT),
    },
  ]));
}

function ArtboardNode({ data, selected, width, height }: NodeProps<CanvasNode>) {
  const contentWidth = Math.round(width ?? data.width);
  const contentHeight = Math.round((height ?? data.height + ARTBOARD_CHROME_HEIGHT) - ARTBOARD_CHROME_HEIGHT);
  return (
    <article
      className="vh-canvas-artboard"
      data-instance-id={data.instanceId ?? data.id}
      data-variant-id={data.variantId ?? data.id}
    >
      <NodeResizer
        isVisible={selected && !data.resizeLocked}
        minWidth={100}
        minHeight={100 + ARTBOARD_CHROME_HEIGHT}
        maxWidth={7680}
        maxHeight={7680 + ARTBOARD_CHROME_HEIGHT}
        lineClassName="vh-canvas-resize-line"
        handleClassName="vh-canvas-resize-handle"
      />
      <header className="vh-canvas-artboard-header">
        {data.onOpenArtboard ? <button type="button" className="vh-canvas-artboard-open nodrag" aria-label={`Open ${data.name} detail`} onClick={() => data.onOpenArtboard?.(data.id)}>{data.name}</button> : <strong>{data.name}</strong>}
        <span className="vh-canvas-artboard-dimensions nodrag">
          <label><span className="vh-sr-only">Width</span><input type="number" inputMode="numeric" min={100} max={7680} disabled={data.resizeLocked} value={contentWidth} onChange={(event) => data.onSizeChange?.(data.id, Number(event.target.value), contentHeight)} /></label>
          <span aria-hidden="true">×</span>
          <label><span className="vh-sr-only">Height</span><input type="number" inputMode="numeric" min={100} max={7680} disabled={data.resizeLocked} value={contentHeight} onChange={(event) => data.onSizeChange?.(data.id, contentWidth, Number(event.target.value))} /></label>
        </span>
      </header>
      <div className="vh-canvas-artboard-viewport">
        {data.error ? <div className="vh-source-error" role="alert">{data.error}</div> : <VariantHubPreviewFrame onFrameRef={(frame) => data.onFrameRef?.(data.instanceId ?? data.id, frame)} onLoad={(frame) => data.onFrameLoad?.(data.instanceId ?? data.id, frame)} src={data.src} title={`${data.name} canvas preview`} instanceId={data.instanceId ?? data.id} variantId={data.variantId ?? data.id} />}
        {data.handActive ? <span className="vh-canvas-pan-overlay" aria-hidden="true" /> : null}
      </div>
    </article>
  );
}

const nodeTypes = { artboard: ArtboardNode };
const EMPTY_LAYOUT: Record<string, VariantHubCanvasGeometry> = {};

export function VariantHubCanvasPrototype({
  artboards,
  initialLayout,
  resizeLocked = false,
  className,
  onLayoutChange,
  onFrameRef,
  onFrameLoad,
  onOpenArtboard,
  initialViewport,
  onViewportChange,
}: VariantHubCanvasPrototypeProps) {
  const fallbackPositions = useMemo(() => defaultPositions(artboards), [artboards]);
  const resolvedInitialLayout = initialLayout ?? EMPTY_LAYOUT;
  const initialNodes = useMemo<CanvasNode[]>(() => artboards.map((artboard, index) => {
    const stored = resolvedInitialLayout[artboard.id];
    const position = stored ?? fallbackPositions[index]!;
    return {
      id: artboard.id,
      type: "artboard",
      position: { x: position.x, y: position.y },
      width: stored?.width ?? artboard.width,
      height: (stored?.height ?? artboard.height) + ARTBOARD_CHROME_HEIGHT,
      ariaLabel: `${artboard.name}, ${Math.round(stored?.width ?? artboard.width)} by ${Math.round(stored?.height ?? artboard.height)}`,
      dragHandle: ".vh-canvas-artboard-header",
      data: { ...artboard, resizeLocked, handActive: true },
    };
  }), [artboards, fallbackPositions, resolvedInitialLayout, resizeLocked]);
  const [nodes, setNodes] = useState(initialNodes);
  const [appliedLayout, setAppliedLayout] = useState(resolvedInitialLayout);
  const [flow, setFlow] = useState<ReactFlowInstance<CanvasNode>>();
  const [handActive, setHandActive] = useState(true);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<{ label: string; x: number; visible: boolean }>();
  useEffect(() => {
    if (!tooltip?.visible) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.target instanceof globalThis.Node && toolbarRef.current?.contains(event.target)) event.stopPropagation();
      setTooltip((current) => current && { ...current, visible: false });
    };
    window.addEventListener("keydown", dismiss, true);
    return () => window.removeEventListener("keydown", dismiss, true);
  }, [tooltip?.visible]);

  const showTooltip = (button: HTMLButtonElement) => {
    const toolbar = toolbarRef.current;
    const label = button.dataset.tooltip;
    if (!toolbar || !label) return;
    const buttonRect = button.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    setTooltip({ label, x: buttonRect.left - toolbarRect.left + buttonRect.width / 2, visible: true });
  };
  const describedBy = (label: string) => tooltip?.visible && tooltip.label === label ? tooltipId : undefined;

  if (appliedLayout !== resolvedInitialLayout) {
    setAppliedLayout(resolvedInitialLayout);
    setNodes((current) => artboards.map((artboard, index) => {
      const existing = current.find((node) => node.id === artboard.id);
      const stored = resolvedInitialLayout[artboard.id];
      const position = stored ?? existing?.position ?? fallbackPositions[index]!;
      const width = stored?.width ?? artboard.width;
      const height = (stored?.height ?? artboard.height) + ARTBOARD_CHROME_HEIGHT;
      return {
        ...existing,
        id: artboard.id,
        type: "artboard",
        position: { x: position.x, y: position.y },
        width,
        height,
        measured: { width, height },
        ariaLabel: `${artboard.name}, ${Math.round(stored?.width ?? artboard.width)} by ${Math.round(stored?.height ?? artboard.height)}`,
        dragHandle: ".vh-canvas-artboard-header",
        data: { ...artboard, resizeLocked, handActive: true },
      };
    }));
  }

  const handleNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    const next = applyNodeChanges(changes, nodes);
    setNodes(next);
    if (changes.some((change) => change.type === "dimensions" && change.resizing === false)) {
      onLayoutChange?.(nodesToLayout(next));
    }
  }, [nodes, onLayoutChange]);

  const commitLayout = useCallback(() => onLayoutChange?.(nodesToLayout(nodes)), [nodes, onLayoutChange]);
  const handleSizeChange = useCallback((id: string, width: number, height: number) => {
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;
    const boundedWidth = Math.min(7680, Math.max(100, width));
    const boundedHeight = Math.min(7680, Math.max(100, height)) + ARTBOARD_CHROME_HEIGHT;
    const next = nodes.map((node) => node.id === id ? {
      ...node,
      width: boundedWidth,
      height: boundedHeight,
      measured: { width: boundedWidth, height: boundedHeight },
    } : node);
    setNodes(next);
    onLayoutChange?.(nodesToLayout(next));
  }, [nodes, onLayoutChange]);
  const visibleNodes = useMemo(() => nodes.map((node) => ({
    ...node,
    data: { ...node.data, resizeLocked, handActive, onSizeChange: handleSizeChange, onFrameRef, onFrameLoad, onOpenArtboard },
  })), [handleSizeChange, handActive, nodes, onFrameLoad, onFrameRef, onOpenArtboard, resizeLocked]);

  const arrange = useCallback(() => {
    let x = 0;
    const next = nodes.map((node) => {
      const arranged = { ...node, position: { x, y: 0 } };
      x += (node.measured?.width ?? node.width ?? node.data.width) + ARTBOARD_GAP;
      return arranged;
    });
    setNodes(next);
    onLayoutChange?.(nodesToLayout(next));
  }, [nodes, onLayoutChange]);
  const selectedNodes = nodes.filter((node) => node.selected);

  return (
    <section className={["vh-canvas-prototype", className].filter(Boolean).join(" ")} aria-label="Canvas prototype">
      <ReactFlow<CanvasNode>
        nodes={visibleNodes}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStop={commitLayout}
        onInit={setFlow}
        defaultViewport={initialViewport}
        onMoveEnd={(_, viewport) => onViewportChange?.(viewport)}
        nodesDraggable={!handActive}
        panOnDrag
        selectionOnDrag={!handActive}
        minZoom={0.2}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.08 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Panel position="bottom-center" className="vh-canvas-toolbar">
          <div
            ref={toolbarRef}
            className="vh-canvas-toolbar-inner"
            onPointerOver={(event) => {
              if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
              const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-tooltip]");
              if (button) showTooltip(button);
            }}
            onPointerLeave={() => {
              if (!(toolbarRef.current?.contains(document.activeElement) && document.activeElement?.matches(":focus-visible"))) setTooltip((current) => current && { ...current, visible: false });
            }}
            onFocus={(event) => {
              const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-tooltip]");
              if (button?.matches(":focus-visible")) showTooltip(button);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setTooltip((current) => current && { ...current, visible: false });
            }}
          >
            <span
              id={tooltipId}
              role="tooltip"
              className="vh-canvas-tooltip"
              data-visible={tooltip?.visible ?? false}
              style={{ transform: `translate3d(calc(${tooltip?.x ?? 0}px - 50%), 0, 0) scale(${tooltip?.visible ? 1 : 0.96})` }}
            >
              {tooltip?.label ?? "Canvas control"}
            </span>
            <button type="button" data-tooltip="Pan canvas" aria-describedby={describedBy("Pan canvas")} aria-label="Hand tool" aria-pressed={handActive} onClick={() => setHandActive((value) => !value)}><Hand /></button>
            <span aria-hidden="true" />
            <button type="button" data-tooltip="Arrange artboards" aria-describedby={describedBy("Arrange artboards")} aria-label="Arrange artboards" onClick={arrange}><AlignHorizontalDistributeCenter /></button>
            <button type="button" data-tooltip={selectedNodes.length ? "Center selection" : "Select an artboard to center it"} aria-describedby={describedBy(selectedNodes.length ? "Center selection" : "Select an artboard to center it")} aria-label="Center selection" aria-disabled={!selectedNodes.length} onClick={() => { if (selectedNodes.length) void flow?.fitView({ nodes: selectedNodes, padding: 0.12, duration: 220 }); }}><Focus /></button>
            <button type="button" data-tooltip="Zoom out" aria-describedby={describedBy("Zoom out")} aria-label="Zoom out" onClick={() => void flow?.zoomOut({ duration: 160 })}><Minus /></button>
            <button type="button" data-tooltip="Zoom in" aria-describedby={describedBy("Zoom in")} aria-label="Zoom in" onClick={() => void flow?.zoomIn({ duration: 160 })}><Plus /></button>
            <button type="button" data-tooltip="Fit all artboards" aria-describedby={describedBy("Fit all artboards")} aria-label="Fit all" onClick={() => void flow?.fitView({ padding: 0.08, duration: 220 })}><Maximize /></button>
            <button type="button" data-tooltip="Reset zoom" aria-describedby={describedBy("Reset zoom")} aria-label="Reset zoom" onClick={() => void flow?.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 220 })}><RotateCcw /></button>
          </div>
        </Panel>
      </ReactFlow>
    </section>
  );
}
