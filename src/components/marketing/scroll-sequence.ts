"use client";
import { useEffect, useRef, useState } from "react";

let navigationFrame = 0;

/** Anchor navigation bypasses the presentation steps and has a bounded duration. */
export function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  cancelAnimationFrame(navigationFrame);
  window.dispatchEvent(new CustomEvent("marketing-navigation", { detail: true }));
  const start = scrollY;
  const end = Math.max(0, start + target.getBoundingClientRect().top - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0));
  const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320;
  const started = performance.now();
  const tick = (now: number) => {
    const progress = duration ? Math.min(1, (now - started) / duration) : 1;
    window.scrollTo({ top: start + (end - start) * (1 - Math.pow(1 - progress, 3)), behavior: "instant" });
    if (progress < 1) navigationFrame = requestAnimationFrame(tick);
    else window.dispatchEvent(new CustomEvent("marketing-navigation", { detail: false }));
  };
  navigationFrame = requestAnimationFrame(tick);
}

/** Native scroll positioning, with deliberate wheel steps for the hero. */
export function useScrollSequence(count: number, blend = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, updateActive] = useState(0);
  const activeRef = useRef(0);
  const setActive = (step: number) => {
    lastScrollStep.current = step;
    activeRef.current = step;
    updateActive(step);
    if (pinned && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const progress = .04 + .88 * (step + .5) / count;
      window.scrollTo({ top: scrollY + rect.top - 16 + progress * (rect.height - innerHeight), behavior: "instant" });
    }
    for (let i = 0; i < count; i++) {
      ref.current?.style.setProperty(`--reveal-${i}`, i === step ? "1" : "0");
      ref.current?.style.setProperty(`--opacity-${i}`, i === step ? "1" : "0");
    }
  };
  const [pinned, setPinned] = useState(false);
  const lastScrollStep = useRef(-1);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = matchMedia(
      "(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)",
    );
    let wasDesktop = media.matches;
    let frame = 0;
    let entered = false;
    let wheelAt = -Infinity;
    let navigating = false;
    const stage = node.querySelector<HTMLElement>(".hero-stage, .install-field");
    let transitionTop: number | undefined;
    let movement: Animation | undefined;
    const rememberPosition = () => {
      transitionTop = stage?.getBoundingClientRect().top;
      movement?.cancel();
    };

    let lockedUntil = 0;
    let lastWheelAt = -Infinity;
    let lastDirection = 0;
    let wheelDistance = 0;
    let previousPixels = 0;
    const intent = (event: WheelEvent) => {
      const now = performance.now();
      const direction = Math.sign(event.deltaY);
      const freshGesture = now - lastWheelAt > 180 || direction !== lastDirection;
      if (direction !== lastDirection) wheelDistance = 0;
      lastWheelAt = now;
      lastDirection = direction;
      if (event.deltaY > 0) wheelAt = now;
      if (blend || !media.matches || navigating || event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      const rect = node.getBoundingClientRect();
      const distance = rect.height - innerHeight;
      const progress = (16 - rect.top) / distance;
      const threshold = innerHeight * .22;
      // Reach the compact preview before capturing a gesture for expansion.
      if (event.deltaY > 0 && rect.top > threshold + 1 && rect.top < innerHeight && rect.top - event.deltaY <= threshold) {
        event.preventDefault();
        window.scrollTo({ top: scrollY + rect.top - threshold, behavior: "instant" });
        return;
      }
      const entering = event.deltaY > 0 && rect.top > 16 && rect.top <= threshold + 1;
      const returning = event.deltaY < 0 && progress >= .94 && rect.bottom > 0 && rect.top - event.deltaY > 16 - distance;
      if (!entering && !returning && (progress < 0 || progress >= .94)) return;
      event.preventDefault();
      const pixels = Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      const decaying = !freshGesture && pixels < previousPixels;
      previousPixels = pixels;
      // Discard movement during the transition; never queue another step.
      if (now < lockedUntil) { wheelDistance = 0; return; }
      // Ignore a decaying tail, but let deliberate small wheel movements accumulate.
      if (pixels < 12 && decaying) return;
      wheelDistance += pixels;
      if (!entering && !returning && wheelDistance < 80) return;
      wheelDistance = 0;
      lockedUntil = now + 700;
      const next = entering ? 0 : returning ? count - 1 : activeRef.current + direction;
      const target = next < 0 ? -.08 : next >= count ? 1 : .04 + .88 * (next + .5) / count;
      if (entering || returning || next < 0 || next >= count) rememberPosition();
      entered = next >= 0 && next < count;
      window.scrollTo({ top: scrollY + rect.top - 16 + target * distance, behavior: "instant" });
    };
    const update = () => {
      frame = 0;
      if (navigating) return;
      if (!media.matches) {
        if (wasDesktop && activeRef.current !== 0) {
          lastScrollStep.current = 0;
          activeRef.current = 0;
          updateActive(0);
        }
        wasDesktop = false;
        node.style.setProperty("--expansion", "0");
        for (let i = 0; i < count; i++) { node.style.removeProperty(`--reveal-${i}`); node.style.removeProperty(`--opacity-${i}`); }
        setPinned(false);
        return;
      }
      wasDesktop = true;
      const rect = node.getBoundingClientRect();
      const distance = rect.height - innerHeight;
      if (rect.top > innerHeight * .5) entered = false;
      if (blend && !entered && rect.top <= innerHeight * .22 && rect.top > 16 && performance.now() - wheelAt < 250) {
        rememberPosition();
        entered = true;
        window.scrollTo({ top: scrollY + rect.top - 16 + 1, behavior: "instant" });
      }
      const progress = Math.max(0, Math.min(1, (16 - rect.top) / distance));
      const expansion = (entered || progress > 0) && progress < 0.94 ? 1 : 0;
      node.style.setProperty("--expansion", String(expansion));
      setPinned(expansion === 1);
      if (stage && transitionTop !== undefined) {
        // Preserve the on-screen origin across the scroll anchor change.
        const offset = transitionTop - stage.getBoundingClientRect().top;
        transitionTop = undefined;
        movement = stage.animate(
          [{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }],
          { duration: 650, easing: "cubic-bezier(.22,1,.36,1)" },
        );
      }
      if (progress > 0 && progress < 1) {
        const step = Math.min(
          count - 1,
          Math.max(0, Math.floor(((progress - 0.04) / 0.88) * count)),
        );
        if (blend) {
          // Scroll chooses a destination; CSS finishes the full transition.
          for (let i = 0; i < count; i++) {
            node.style.setProperty(`--reveal-${i}`, i === step ? "1" : "0");
            node.style.setProperty(`--opacity-${i}`, i === step ? "1" : "0");
          }
        }
        if (step !== lastScrollStep.current) {
          lastScrollStep.current = step;
          activeRef.current = step;
          updateActive(step);
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onNavigation = (event: Event) => {
      navigating = (event as CustomEvent<boolean>).detail;
      movement?.cancel();
      transitionTop = undefined;
      entered = false;
      wheelAt = -Infinity;
      wheelDistance = 0;
      if (navigating) {
        node.style.setProperty("--expansion", "0");
        setPinned(false);
      } else schedule();
    };
    window.addEventListener("marketing-navigation", onNavigation);
    update();
    addEventListener("wheel", intent, { passive: false });
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    return () => {
      window.removeEventListener("marketing-navigation", onNavigation);
      movement?.cancel();
      cancelAnimationFrame(frame);
      removeEventListener("wheel", intent);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
    };
  }, [count, blend]);
  return { ref, active, setActive, pinned };
}

/** Preserve outgoing content until its short exit finishes. */
export function useSwitchMotion(selected: number) {
  const [displayed, setDisplayed] = useState(selected);
  const [leaving, setLeaving] = useState(false);
  const [direction, setDirection] = useState(1);
  useEffect(() => {
    if (selected === displayed) {
      const reset = setTimeout(() => setLeaving(false), 0);
      return () => clearTimeout(reset);
    }

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exit = setTimeout(() => { setDirection(selected > displayed ? 1 : -1); setLeaving(true); }, 0);
    const enter = setTimeout(() => {
      setDisplayed(selected);
      setLeaving(false);
    }, reduced ? 0 : 160);
    return () => { clearTimeout(exit); clearTimeout(enter); };
  }, [selected, displayed]);
  return { displayed, leaving, direction };
}
