"use client";

import { Component, Suspense, type ReactNode } from "react";
import type { VariantHubVariantSource, VariantMeta } from "./types";

export type VariantSourceResult =
  | { source: VariantHubVariantSource; error?: undefined }
  | { source?: undefined; error: string };

const REACT_OBJECT_TYPES = new Set([Symbol.for("react.lazy"), Symbol.for("react.memo"), Symbol.for("react.forward_ref")]);
function isReactComponentType(value: unknown) {
  return typeof value === "function" || (typeof value === "object" && value !== null && REACT_OBJECT_TYPES.has((value as { $$typeof?: symbol }).$$typeof!));
}

export function resolveVariantSource(variant: VariantMeta): VariantSourceResult {
  const source = variant.source ?? (
    isReactComponentType(variant.component)
      ? { type: "react" as const, component: variant.component }
      : undefined
  );

  if (!source) return { error: "This variant has no renderable source." };
  if (source.type === "react") {
    return isReactComponentType(source.component)
      ? { source }
      : { error: "The React source is missing its component." };
  }
  if (source.type === "html") {
    if (typeof source.entry !== "string" || source.entry.trim().length === 0) return { error: "The HTML source is missing its entry." };
    const entry = source.entry.trim();
    if (entry.startsWith("//")) return { error: "The HTML entry must be a safe relative path or HTTP(S) URL." };
    try {
      const url = new URL(entry, "http://varianthub.local/");
      return url.protocol === "http:" || url.protocol === "https:" ? { source: { ...source, entry } } : { error: "The HTML entry must be a safe relative path or HTTP(S) URL." };
    } catch { return { error: "The HTML entry is invalid." }; }
  }
  if (source.type === "url") {
    try {
      const url = new URL(source.url);
      return url.protocol === "http:" || url.protocol === "https:"
        ? { source }
        : { error: "The URL source must use HTTP or HTTPS." };
    } catch {
      return { error: "The URL source is invalid." };
    }
  }
  return { error: "This variant uses an unknown source type." };
}

export function getVariantSourceType(variant: VariantMeta) {
  return resolveVariantSource(variant).source?.type ?? "invalid";
}

class VariantErrorBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="vh-source-error" role="alert">Could not render “{this.props.name}”.</div>
      : this.props.children;
  }
}

export function VariantHubVariantContent({
  variant,
  componentProps = {},
  fallback = <div role="status">Loading variant…</div>,
}: {
  variant: VariantMeta;
  componentProps?: Record<string, unknown>;
  fallback?: ReactNode;
}) {
  const result = resolveVariantSource(variant);
  if (!result.source) {
    return <div className="vh-source-error" role="alert">{result.error}</div>;
  }
  const source = result.source;

  if (source.type === "html") {
    return <iframe className="vh-source-frame" src={source.entry} title={variant.name} />;
  }

  if (source.type === "url") {
    return <iframe className="vh-source-frame" src={source.url} title={variant.name} />;
  }

  const Component = source.component;
  return (
    <VariantErrorBoundary name={variant.name}>
      <Suspense fallback={fallback}>
        <Component {...componentProps} />
      </Suspense>
    </VariantErrorBoundary>
  );
}
