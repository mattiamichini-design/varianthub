"use client";

import { useEffect, useRef } from "react";

/*
 * The VariantHub mark is a 5×5 pixel grid on a cobalt tile. At rest the lit
 * pixels spell V; the motion turns them into H. Arm pixels slide outward, the
 * tip switches off and the crossbar lights up from the centre, row by row from
 * the top. Geometry and timing mirror the brand motion board in Paper.
 */
const TILE = 626;
const PAD = 66;
const CELL = 82;
const PITCH = 103;
const TILE_RADIUS = 96;
const CELL_RADIUS = 16;
const COBALT = "#1C5AFE";
const DIM = "#5583FE"; // white at 25% over cobalt

const V_ROWS = ["#...#", "#...#", ".#.#.", ".#.#.", "..#.."];
const H_ROWS = ["#...#", "#...#", "#####", "#...#", "#...#"];
const lit = (rows: string[]) =>
  new Set(rows.flatMap((row, r) => [...row].flatMap((pixel, c) => (pixel === "#" ? [r * 5 + c] : []))));
const V = lit(V_ROWS);
const H = lit(H_ROWS);

// Horizontal travel in columns: where a lighting pixel comes from, or where a
// dimming pixel goes. Only cells that change between V and H are listed.
const SLIDE: Record<number, number> = {
  10: 1, 12: 0, 14: -1, 15: 1, 19: -1, 20: 2, 24: -2, // on
  16: -1, 18: 1, 22: 0, // off
};
const ROW_DELAY = [0, 0, 0, 70, 140];
const EDGE_DELAY = 25;
const CELL_WINDOW = 320;
const DURATION = 490;
const TRAVEL = 0.35;
const LOOP_HOLD = 1400;
const FADE = 160;
const OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

const cells = Array.from({ length: 25 }, (_, index) => index);
const litCells = cells.filter((index) => V.has(index) || H.has(index));
const position = (index: number) => ({
  x: PAD + (index % 5) * PITCH,
  y: PAD + Math.floor(index / 5) * PITCH,
});

const pose = (opacity: number, x: number, scale: number) => ({
  opacity,
  transform: `translateX(${x}px) scale(${scale})`,
});

/** Keyframes for one changing pixel, with `lead` ms of stillness before it. */
function cellKeyframes(index: number, lead: number, length: number): Keyframe[] {
  const begin = ROW_DELAY[Math.floor(index / 5)] + (index % 5 === 2 ? 0 : EDGE_DELAY);
  const at = (ms: number) => (lead + begin + ms) / length;
  const shift = SLIDE[index] * PITCH * TRAVEL;
  if (H.has(index)) {
    return [
      { offset: 0, ...pose(0, shift, 0.7) },
      { offset: at(0), ...pose(0, shift, 0.7), easing: OUT },
      { offset: at(CELL_WINDOW * 0.55), ...pose(1, shift * -0.08, 1.06), easing: OUT },
      { offset: at(CELL_WINDOW), ...pose(1, 0, 1) },
      { offset: 1, ...pose(1, 0, 1) },
    ];
  }
  return [
    { offset: 0, ...pose(1, 0, 1) },
    { offset: at(0), ...pose(1, 0, 1), easing: IN_OUT },
    { offset: at(CELL_WINDOW * 0.6), ...pose(0, shift, 0.7) },
    { offset: 1, ...pose(0, shift, 0.7) },
  ];
}

function changingCells(svg: SVGSVGElement) {
  return [...svg.querySelectorAll<SVGRectElement>("[data-cell]")]
    .map((element) => [element, Number(element.dataset.cell)] as const)
    .filter(([, index]) => V.has(index) !== H.has(index));
}

/**
 * Hover plays V → H; leaving reverses from wherever the motion is, so a quick
 * pass never jumps. Keyboard focus counts as hover, and a tap plays the whole
 * round trip once.
 */
function bindHover(svg: SVGSVGElement, reduced: boolean) {
  const trigger = svg.closest<HTMLElement>("[data-mark-trigger]") ?? svg.parentElement;
  if (!trigger) return;
  const animations = changingCells(svg).map(([element, index]) =>
    reduced
      ? element.animate({ opacity: H.has(index) ? [0, 1] : [1, 0] }, { duration: FADE, fill: "both", easing: "ease-out" })
      : element.animate(cellKeyframes(index, 0, DURATION), { duration: DURATION, fill: "both" }),
  );
  animations.forEach((animation) => animation.pause());
  let direction = -1;
  let tapTimer = 0;
  const go = (next: 1 | -1) => {
    if (next === direction) return;
    direction = next;
    for (const animation of animations) {
      animation.playbackRate = next;
      animation.play();
    }
  };
  const engaged = () => trigger.matches(":hover") || trigger.matches(":focus-visible");
  const enter = (event: PointerEvent) => event.pointerType !== "touch" && go(1);
  const leave = (event: PointerEvent) => event.pointerType !== "touch" && !engaged() && go(-1);
  const focus = () => trigger.matches(":focus-visible") && go(1);
  const blur = () => !trigger.matches(":hover") && go(-1);
  const tap = (event: PointerEvent) => {
    if (event.pointerType !== "touch") return;
    clearTimeout(tapTimer);
    go(1);
    tapTimer = window.setTimeout(() => go(-1), DURATION + 520);
  };
  trigger.addEventListener("pointerenter", enter);
  trigger.addEventListener("pointerleave", leave);
  trigger.addEventListener("pointerup", tap);
  trigger.addEventListener("focus", focus);
  trigger.addEventListener("blur", blur);
  return () => {
    clearTimeout(tapTimer);
    trigger.removeEventListener("pointerenter", enter);
    trigger.removeEventListener("pointerleave", leave);
    trigger.removeEventListener("pointerup", tap);
    trigger.removeEventListener("focus", focus);
    trigger.removeEventListener("blur", blur);
    animations.forEach((animation) => animation.cancel());
  };
}

/**
 * V → H, hold, H → V, hold, forever. Each iteration is half a hold, the
 * motion, then half a hold; alternating iterations make the holds meet. It
 * only runs while the mark is on screen.
 */
function bindLoop(svg: SVGSVGElement) {
  const length = DURATION + LOOP_HOLD;
  const animations = changingCells(svg).map(([element, index]) =>
    element.animate(cellKeyframes(index, LOOP_HOLD / 2, length), {
      duration: length,
      iterations: Infinity,
      direction: "alternate",
      fill: "both",
    }),
  );
  animations.forEach((animation) => animation.pause());
  const observer = new IntersectionObserver(([entry]) => {
    const time = animations[0]?.currentTime ?? 0;
    for (const animation of animations) {
      animation.currentTime = time;
      if (entry.isIntersecting) animation.play();
      else animation.pause();
    }
  });
  observer.observe(svg);
  return () => {
    observer.disconnect();
    animations.forEach((animation) => animation.cancel());
  };
}

type MarkMotion = "static" | "hover" | "loop";

/**
 * The pixel-grid mark. `hover` listens on the closest `[data-mark-trigger]`
 * ancestor (usually the brand link). With reduced motion the loop stays on V
 * and hover becomes a short crossfade.
 */
export function VariantHubMark({
  motion = "static",
  className,
}: {
  motion?: MarkMotion;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg || motion === "static" || typeof svg.animate !== "function") return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (motion === "hover") return bindHover(svg, reduced);
    if (!reduced) return bindLoop(svg);
  }, [motion]);
  return (
    <svg
      ref={ref}
      className={className}
      viewBox={`0 0 ${TILE} ${TILE}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect width={TILE} height={TILE} rx={TILE_RADIUS} fill={COBALT} />
      {cells.map((index) => (
        <rect key={index} {...position(index)} width={CELL} height={CELL} rx={CELL_RADIUS} fill={DIM} />
      ))}
      {litCells.map((index) => (
        <rect
          key={index}
          data-cell={index}
          {...position(index)}
          width={CELL}
          height={CELL}
          rx={CELL_RADIUS}
          fill="#FFFFFF"
          opacity={V.has(index) ? 1 : 0}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}
    </svg>
  );
}
