"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Reports once that an element has entered the viewport; it never resets.
 * Pair the returned flag with `data-inview` so CSS can play one-time delight
 * animations. Only decorative elements wait for it, and only when motion is
 * allowed; tall elements count as visible once half the viewport is covered.
 */
export function useInView<T extends Element = HTMLDivElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  const ref = useCallback((element: T | null) => setNode(element), []);
  useEffect(() => {
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const viewport = entry.rootBounds?.height ?? innerHeight;
          if (entry.intersectionRatio >= 0.35 || entry.intersectionRect.height >= viewport * 0.5) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { threshold: [0, 0.15, 0.35, 0.6, 1], rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, inView]);
  return [ref, inView] as const;
}
