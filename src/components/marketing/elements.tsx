"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Check,
  Copy,
  ArrowRight,
  Star,
  Layers,
  FolderGit2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/** Paper B3: color, organic contours and grain remain independently editable. */
export function BrandField({
  children,
  className = "",
  patternX = 0,
  patternY = 0,
}: {
  children?: ReactNode;
  className?: string;
  patternX?: number;
  patternY?: number;
}) {
  return (
    <div
      className={`brand-field ${className}`}
      style={
        {
          "--pattern-x": `${patternX}px`,
          "--pattern-y": `${patternY}px`,
        } as CSSProperties
      }
    >
      <div className="brand-color" aria-hidden="true">
        <div className="brand-volume" />
        <div className="brand-light" />
      </div>
      <div className="brand-contours" aria-hidden="true" />
      <div className="brand-grain" aria-hidden="true" />
      <div className="brand-content">{children}</div>
    </div>
  );
}

export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`copy-button ${className}`}
      aria-live="polite"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setStatus("copied");
        } catch {
          setStatus("failed");
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setStatus("idle"), 2500);
      }}
    >
      {status === "copied" ? <Check /> : <Copy />}
      {status === "copied"
        ? "Copied"
        : status === "failed"
          ? "Select text to copy"
          : label}
    </Button>
  );
}

export function WindowChrome({ title }: { title: string }) {
  return (
    <div className="window-chrome">
      <span className="window-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>{title}</span>
      <span className="window-balance" />
    </div>
  );
}

export function SectionHeading({
  title,
  children,
  left = false,
}: {
  title: ReactNode;
  children?: ReactNode;
  left?: boolean;
}) {
  return (
    <div className={`section-heading ${left ? "text-left" : "text-center"}`}>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

/** Decorative pointer used by the delight stickers; never focusable. */
export function DemoCursor({ className = "" }: { className?: string }) {
  return (
    <svg className={`demo-cursor ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 3.5 19 10l-6.2 1.9L10 18.5 5 3.5Z" />
    </svg>
  );
}
export function BehaviorArt() {
  const [clicked, setClicked] = useState<number | null>(null);
  return (
    <div className="glass behavior-art">
      {["cobalt", "slate", "violet"].map((tone, index) => (
        <button
          key={tone}
          className={`demo-action ${tone}`}
          onClick={() => setClicked(clicked === index ? null : index)}
        >
          {clicked === index ? "Action complete" : "Demo action"}
          {clicked === index ? <Check /> : <ArrowRight />}
          {tone === "slate" && <span className="demo-ring dl" aria-hidden="true" />}
        </button>
      ))}
      <span className="behavior-pointer" aria-hidden="true">
        <DemoCursor className="dl" />
        <span className="state-chip dl">
          <code>:hover</code>
          <span>Slate / quiet</span>
        </span>
      </span>
    </div>
  );
}

export function ContextArt() {
  return (
    <div
      className="context-art"
      aria-label="Landing, pricing and details keep the full page context"
    >
      {["Landing", "Pricing", "Details"].map((title, index) => (
        <div className="glass mini-page" key={title}>
          <div>
            <strong>{title}</strong>
            <span>0{index + 1}/03</span>
          </div>
          <div className="mini-page-body">
            <i />
            <i />
            <b />
          </div>
        </div>
      ))}
    </div>
  );
}
export function ViewportsArt() {
  return (
    <div
      className="viewports-art"
      aria-label="Nested Mobile 390, Tablet 768, Desktop 1440 and Wide 1920 viewports"
    >
      {["Wide · 1920", "Desktop · 1440", "Tablet · 768", "Mobile · 390"].map(
        (label, index) => (
          <div key={label} className={`viewport-outline viewport-${index}`}>
            <span>{label}</span>
            {index === 3 && (
              <div className="viewport-lines">
                <i />
                <i />
                <b />
              </div>
            )}
            {index === 2 && (
              <div className="viewport-handle dl" aria-hidden="true">
                <i />
                <span className="viewport-readout">
                  ↔ <span className="readout-number" />px
                </span>
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
}
export function ShortlistArt() {
  const [favorites, setFavorites] = useState([true, true]);
  return (
    <div className="glass shortlist-art">
      <span className="favorite-toast dl" aria-hidden="true">
        <Star />
        Added to favorites
        <kbd>F</kbd>
      </span>
      <div className="shortlist-label">
        <Star />
        <strong>Your favorites</strong>
        <span>{favorites.filter(Boolean).length}</span>
      </div>
      {["Cobalt focus", "Quiet surface"].map((label, index) => (
        <div className="favorite-row" key={label}>
          <span className={`favorite-swatch swatch-${index}`} />
          <span>{label}</span>
          <button
            aria-label={`${favorites[index] ? "Remove" : "Add"} ${label} ${favorites[index] ? "from" : "to"} favorites`}
            aria-pressed={favorites[index]}
            onClick={() =>
              setFavorites((values) =>
                values.map((value, i) => (i === index ? !value : value)),
              )
            }
          >
            <Star fill={favorites[index] ? "currentColor" : "none"} />
          </button>
        </div>
      ))}
    </div>
  );
}
export function SetupArt({ step }: { step: number }) {
  return (
    <div className="setup-art" aria-hidden="true">
      <div className="setup-layer layer-back" />
      <div className="setup-layer layer-mid" />
      <div className="setup-layer layer-front">
        {step === 0 ? (
          <>
            <strong>
              <FolderGit2 />
              your-project
            </strong>
            <code>src/</code>
            <code>package.json</code>
          </>
        ) : step === 1 ? (
          <>
            <strong>
              Button / 03 <Layers />
            </strong>
            <span className="setup-action">Continue</span>
          </>
        ) : (
          <>
            <strong>
              <ExternalLink />
              localhost:4310
            </strong>
            <div className="setup-grid">
              <i />
              <i />
              <i />
              <i />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
