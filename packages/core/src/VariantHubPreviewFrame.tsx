"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

type VariantHubPreviewFrameProps = {
  src: string;
  title: string;
  className?: string;
  instanceId?: string;
  variantId?: string;
  onFrameRef?: (frame: HTMLIFrameElement | null) => void;
  onLoad?: (frame: HTMLIFrameElement) => void;
};

export function VariantHubPreviewFrame({ src, title, className, instanceId, variantId, onFrameRef, onLoad }: VariantHubPreviewFrameProps) {
  const [attempt, setAttempt] = useState(0);
  return <div className={[className, "vh-preview-frame"].filter(Boolean).join(" ")} data-instance-id={instanceId} data-variant-id={variantId}>
    <iframe key={attempt} ref={onFrameRef} src={src} title={title} data-instance-id={instanceId} data-variant-id={variantId} onLoad={(event) => onLoad?.(event.currentTarget)} />
    <div className="vh-preview-frame-actions">
      <a href={src} target="_blank" rel="noreferrer"><ExternalLink /> Open source</a>
      <button type="button" onClick={() => setAttempt((value) => value + 1)}><RefreshCw /> Retry</button>
    </div>
  </div>;
}
