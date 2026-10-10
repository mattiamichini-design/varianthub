"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";

const HANDLE_GUTTER = 18;
const INTRO_DELAY = 450;
const INTRO_DURATION = 950;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The hero's last word as a working before/after slider. The quiet grey
 * version sits underneath and the blue version is wiped in from the right;
 * dragging the handle (or the word itself) moves the seam. On first view the
 * handle glides from the right edge to the gap between "compa" and "rison."
 * once, unless the visitor prefers reduced motion or grabs it first.
 */
export function ComparisonWord({ play }: { play: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const gapRef = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const touched = useRef(false);
  const [seam, setSeam] = useState<number | null>(null);
  const [bounds, setBounds] = useState({ min: 4, max: 96 });
  const [value, setValue] = useState<number | null>(null);
  const [phase, setPhase] = useState<"waiting" | "intro" | "ready">("waiting");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    const gap = gapRef.current;
    if (!box || !gap) return;
    const measure = () => {
      const width = box.offsetWidth;
      if (!width) return;
      const gutter = (HANDLE_GUTTER / width) * 100;
      maxRef.current = 100 - gutter;
      setBounds({ min: gutter, max: 100 - gutter });
      setSeam(((gap.offsetLeft + gap.offsetWidth / 2) / width) * 100);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, []);

  const started = useRef(false);
  const maxRef = useRef(96);
  useEffect(() => {
    if (seam === null || started.current) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || touched.current) {
      started.current = true;
      frame.current = requestAnimationFrame(() => {
        setValue((current) => current ?? seam);
        setPhase("ready");
      });
      return;
    }
    if (!play) return;
    started.current = true;
    const from = maxRef.current;
    let start = 0;
    const step = (time: number) => {
      if (!start) {
        start = time + INTRO_DELAY;
        setPhase("intro");
      }
      const progress = clamp((time - start) / INTRO_DURATION, 0, 1);
      setValue(from + (seam - from) * easeOut(progress));
      if (progress < 1) frame.current = requestAnimationFrame(step);
      else setPhase("ready");
    };
    frame.current = requestAnimationFrame(step);
  }, [seam, play]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const take = useCallback(() => {
    touched.current = true;
    cancelAnimationFrame(frame.current);
    setPhase("ready");
  }, []);

  const moveTo = (clientX: number) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    setValue(clamp(((clientX - rect.left) / rect.width) * 100, bounds.min, bounds.max));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    take();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    moveTo(event.clientX);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) moveTo(event.clientX);
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  };

  const current = value ?? seam ?? 52;
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -4, ArrowDown: -4, ArrowRight: 4, ArrowUp: 4, PageDown: -20, PageUp: 20 };
    let next: number | null = null;
    if (event.key in steps) next = current + steps[event.key];
    else if (event.key === "Home") next = bounds.min;
    else if (event.key === "End") next = bounds.max;
    if (next === null) return;
    event.preventDefault();
    take();
    setValue(clamp(next, bounds.min, bounds.max));
  };

  const word = (
    <>
      <span>compa</span>
      <span className="compare-gap" ref={gapRef} />
      <span>rison.</span>
    </>
  );
  const blue = Math.round(100 - current);

  return (
    <div
      className="compare-word"
      data-phase={phase}
      data-dragging={dragging}
      style={{ "--split": `${current}%` } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="compare-box" ref={boxRef} aria-hidden="true">
        <span className="compare-layer compare-layer-a">{word}</span>
        <span className="compare-layer compare-layer-b">
          <span>compa</span>
          <span className="compare-gap" />
          <span>rison.</span>
        </span>
      </div>
      <span className="compare-line" aria-hidden="true" />
      <div
        className="compare-handle"
        role="slider"
        tabIndex={0}
        aria-label="Compare the grey and blue versions of the word comparison"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={blue}
        aria-valuetext={`${blue}% blue version`}
        onKeyDown={onKeyDown}
      >
        <ChevronsLeftRight aria-hidden="true" />
      </div>
    </div>
  );
}
