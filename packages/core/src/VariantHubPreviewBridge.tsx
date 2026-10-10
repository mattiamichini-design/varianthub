"use client";

import { useEffect } from "react";
import { isEditableEventTarget } from "./fullPage";
import { VARIANT_HUB_MESSAGE_SOURCE } from "./previewProtocol";

export type VariantHubPreviewBridgeProps = {
  projectId?: string;
  itemKey?: string;
  variantId?: string;
  instanceId?: string;
};

export function VariantHubPreviewBridge({
  projectId,
  itemKey,
  variantId,
  instanceId,
}: VariantHubPreviewBridgeProps = {}) {
  useEffect(() => {
    const targetOrigin = window.location.origin;
    const search = new URLSearchParams(window.location.search);
    const identity = {
      projectId: projectId ?? search.get("vhProject") ?? "default",
      itemKey: itemKey ?? search.get("vhItem") ?? undefined,
      variantId: variantId ?? search.get("vhVariant") ?? undefined,
      instanceId: instanceId ?? search.get("vhInstance") ?? "immersive",
    };
    let reportFrame: number | undefined;
    const reportState = () => {
      reportFrame = undefined;
      window.parent.postMessage(
        {
          source: VARIANT_HUB_MESSAGE_SOURCE,
          type: "state",
          ...identity,
          href: window.location.href,
          scrollY: window.scrollY,
        },
        targetOrigin,
      );
    };
    const scheduleReportState = () => {
      if (reportFrame !== undefined) return;
      reportFrame = window.requestAnimationFrame(reportState);
    };
    const flushReportState = () => {
      if (reportFrame !== undefined) {
        window.cancelAnimationFrame(reportFrame);
      }
      reportState();
    };
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    const pushState: History["pushState"] = function (...args) {
      originalPushState.apply(window.history, args);
      scheduleReportState();
    };
    const replaceState: History["replaceState"] = function (...args) {
      originalReplaceState.apply(window.history, args);
      scheduleReportState();
    };
    window.history.pushState = pushState;
    window.history.replaceState = replaceState;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) return;
      const isArrow = event.key === "ArrowLeft" || event.key === "ArrowRight";
      if (!isArrow && event.key !== "Escape") {
        return;
      }
      window.parent.postMessage(
        {
          source: VARIANT_HUB_MESSAGE_SOURCE,
          type: "shortcut",
          key: event.key,
          shiftKey: event.shiftKey,
          ...identity,
        },
        targetOrigin,
      );
    };
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== targetOrigin) {
        event.preventDefault();
        window.open(url.href, "_blank", "noopener,noreferrer");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", scheduleReportState, { passive: true });
    window.addEventListener("popstate", scheduleReportState);
    window.addEventListener("hashchange", scheduleReportState);
    window.addEventListener("pagehide", flushReportState);
    document.addEventListener("click", handleClick);
    reportState();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", scheduleReportState);
      window.removeEventListener("popstate", scheduleReportState);
      window.removeEventListener("hashchange", scheduleReportState);
      window.removeEventListener("pagehide", flushReportState);
      document.removeEventListener("click", handleClick);
      if (reportFrame !== undefined) {
        window.cancelAnimationFrame(reportFrame);
      }
      if (window.history.pushState === pushState) {
        window.history.pushState = originalPushState;
      }
      if (window.history.replaceState === replaceState) {
        window.history.replaceState = originalReplaceState;
      }
    };
  }, [instanceId, itemKey, projectId, variantId]);
  return null;
}
