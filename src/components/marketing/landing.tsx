"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Code2,
  Download,
  Expand,
  Grid2X2,
  Maximize2,
  Menu,
  PanelsTopLeft,
  RotateCcw,
  Sparkles,
  SquareMousePointer,
  Star,
  Terminal,
  X,
  Globe,
  FileCode2,
  FileText,
  Diff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  BrandField,
  SectionHeading,
  WindowChrome,
  CopyButton,
  BehaviorArt,
  ContextArt,
  ViewportsArt,
  ShortlistArt,
  DemoCursor,
} from "./elements";
import { useInView } from "./use-in-view";
import { ComparisonWord } from "./comparison-word";
import { VariantHubMark, VariantHubWordmark } from "./variant-hub-logo";
import { Installation } from "./installation";
import { useScrollSequence, useSwitchMotion, scrollToSection } from "./scroll-sequence";
import "./marketing.css";

const features = [
  {
    key: "compare",
    label: "Compare",
    icon: Grid2X2,
    title: "See the differences together.",
    description:
      "Choose a grid density and select the versions you want to compare.",
  },
  {
    key: "arrange",
    label: "Arrange",
    icon: PanelsTopLeft,
    title: "Make room for a closer look.",
    description:
      "Move and resize previews. Use viewport presets, zoom and Fit to frame your comparison.",
  },
  {
    key: "test",
    label: "Test",
    icon: Maximize2,
    title: "Take the whole page for a test.",
    description:
      "Navigate the real page and move between variants without leaving the preview.",
  },
  {
    key: "keep",
    label: "Keep",
    icon: Star,
    title: "Keep the workspace focused.",
    description:
      "Choose visible variants and keep the options you want to explore within reach.",
  },
];
const outcomes = [
  {
    title: "Judge the behavior.",
    label: "Compare",
    text: "Compare working components with the styles and states your project actually uses.",
    art: BehaviorArt,
    x: 0,
    y: 0,
  },
  {
    title: "Keep the full context.",
    label: "Navigate",
    text: "Follow the page. Test the links. See how a direction behaves beyond its first screen.",
    art: ContextArt,
    x: -270,
    y: 35,
  },
  {
    title: "Find the breaking point.",
    label: "Resize",
    text: "Check the same implementation from Mobile through Wide.",
    art: ViewportsArt,
    x: -125,
    y: -70,
  },
  {
    title: "Keep a useful shortlist.",
    label: "Keep",
    text: "Hold on to promising options without crowding the workspace.",
    art: ShortlistArt,
    x: 40,
    y: 95,
  },
];

const worksWith = [
  { label: "React", short: "React", icon: Code2 },
  { label: "HTML", short: "HTML", icon: FileText },
  { label: "Running URLs", short: "URLs", icon: Globe },
  { label: "Your coding agent", short: "Agents", icon: Sparkles },
];

function Header({
  openPlayground,
  hidden,
}: {
  openPlayground: () => void;
  hidden: boolean;
}) {
  const [floating, setFloating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => {
      setFloating(scrollY > 96);
      const ids = ["why-varianthub", "workspace", "agent-skills"];
      setCurrentSection(ids.filter(id => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) < innerHeight * .4).at(-1) ?? "");
    };
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const focusFrame = requestAnimationFrame(() => {
      headerRef.current?.querySelector<HTMLElement>("#mobile-navigation a")?.focus({ preventScroll: true });
    });
    const dismiss = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    addEventListener("pointerdown", dismiss);
    addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      removeEventListener("pointerdown", dismiss);
      removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);
  return (
    <header
      ref={headerRef}
      inert={hidden}
      className={`site-header ${floating ? "is-floating" : ""} ${hidden ? "is-hidden" : ""}`}
    >
      <a href="#top" className="brand" aria-label="VariantHub home" data-mark-trigger>
        <VariantHubMark motion="hover" className="brand-mark" />
        <VariantHubWordmark className="brand-wordmark" />
      </a>
      <nav
        id="mobile-navigation"
        aria-label="Main navigation"
        className={menuOpen ? "mobile-open" : ""}
      >
        {[
          ["Why", "why-varianthub"],
          ["Workspace", "workspace"],
          ["Agent skills", "agent-skills"],
        ].map(([label, id]) => (
          <a key={id} href={`#${id}`} aria-current={currentSection === id ? "location" : undefined} onClick={() => setMenuOpen(false)}>
            {label}
          </a>
        ))}
        <div className="mobile-menu-actions">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              openPlayground();
            }}
          >
            <SquareMousePointer />
            Try Playground
          </button>
          <a href="#installation" onClick={() => setMenuOpen(false)}>
            <Download />
            Install
          </a>
        </div>
      </nav>
      <div className="header-actions">
        <Button
          variant="ghost"
          className="header-playground"
          aria-label="Playground"
          onClick={openPlayground}
        >
          <SquareMousePointer />
          <span>Playground</span>
        </Button>
        <Button asChild className="header-install">
          <a href="#installation">
            <Download />
            Install
          </a>
        </Button>
        <Button
          ref={menuButtonRef}
          size="icon"
          className="menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </div>
    </header>
  );
}

function Hero({
  openPlayground,
  onPinned,
}: {
  openPlayground: (mode?: string, origin?: Element | null) => void;
  onPinned: (pinned: boolean) => void;
}) {
  const { ref, active, setActive, pinned } = useScrollSequence(4);
  const { displayed, leaving, direction } = useSwitchMotion(active);
  const feature = features[displayed];
  useEffect(() => onPinned(pinned), [pinned, onPinned]);
  const exit = () => scrollToSection("why-varianthub");
  const [introRef, introInView] = useInView();
  const [compareRef, compareInView] = useInView();
  return (
    <section className="hero-section" aria-label="Explore VariantHub">
      <div className="hero-intro" ref={introRef} data-inview={introInView}>
        <h1>
          Good interfaces deserve a proper
          <span className="sr-only"> comparison.</span>
        </h1>
        <ComparisonWord play={introInView} />
        <p>
          Put real components and pages side by side. Explore the differences,
          test the details and find the direction you want to keep.
        </p>
        <div className="hero-actions">
          <Button asChild size="lg">
            <a href="#installation">
              <Download />
              Install VariantHub
            </a>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => openPlayground()}
          >
            <SquareMousePointer />
            Try Playground
          </Button>
        </div>
        <div className="works-with">
          <span className="works-with-label dl" aria-hidden="true">Works with</span>
          <ul aria-label="Works with">
            {worksWith.map(({ label, short, icon: Icon }) => (
              <li key={label} className="dl">
                <Icon aria-hidden="true" />
                <span className="works-with-long">{label}</span>
                <span className="works-with-short">{short}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className="hero-scroll sequence-track"
        style={{ "--scene-step": active } as React.CSSProperties}
        ref={ref}
        data-pinned={pinned}
      >
        <BrandField className="hero-stage">
          <div className="hero-stage-top">
            <Tabs
              className="feature-tabs-scroll"
              value={features[active].key}
              onValueChange={(key) => setActive(features.findIndex((item) => item.key === key))}
            >
              <TabsList aria-label="Product features" className="feature-tabs" style={{ "--active-tab": active } as React.CSSProperties}>
                {features.map((item) => (
                  <TabsTrigger
                    key={item.key}
                    value={item.key}
                    id={`feature-tab-${item.key}`}
                    aria-controls="feature-panel"
                  >
                    <item.icon />
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="feature-mobile-nav" aria-label="Product feature navigation">
              <button
                type="button"
                aria-label="Previous feature"
                disabled={active === 0}
                onClick={() => setActive(Math.max(0, active - 1))}
              >
                <ArrowLeft />
              </button>
              <span>
                <span className="feature-mobile-label">
                  <strong>{features[active].label}</strong>
                  <small>{active + 1} / {features.length}</small>
                </span>
                <span className="feature-mobile-progress" aria-hidden="true">
                  {features.map((item, index) => (
                    <i key={item.key} data-active={index <= active} />
                  ))}
                </span>
              </span>
              <button
                type="button"
                aria-label="Next feature"
                disabled={active === features.length - 1}
                onClick={() => setActive(Math.min(features.length - 1, active + 1))}
              >
                <ArrowRight />
              </button>
            </div>
            <Button variant="ghost" className="back-to-page" aria-label="Back to page" tabIndex={pinned ? 0 : -1} aria-hidden={!pinned} onClick={exit}>
              <X />
            </Button>
          </div>
          <div
            className={`feature-card ${leaving ? "is-leaving" : ""}`}
            style={{ "--switch-direction": direction } as React.CSSProperties}
            id="feature-panel"
            role="tabpanel"
            aria-labelledby={`feature-tab-${feature.key}`}
            tabIndex={0}
          >
            <div className="feature-copy" key={`copy-${feature.key}`}>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
              <Button onClick={() => openPlayground(feature.key)}>
                <SquareMousePointer />
                Try Playground
              </Button>
            </div>
            {features.map((preview) => (
            <div
              key={preview.key}
              className="feature-preview-slot"
              aria-hidden={preview.key !== feature.key}
              inert={preview.key !== feature.key}
              ref={preview.key === "compare" ? compareRef : undefined}
              data-inview={preview.key === "compare" ? compareInView : undefined}
            >
            <BrandField className="feature-preview">
              <div className="live-preview">
                <iframe
                  title={`${preview.label} — live VariantHub preview`}
                  src={`/playground?mode=${preview.key}`}
                  loading="eager"
                  tabIndex={-1}
                  inert
                />
                {/* The preview is a window onto the playground: a click zooms into it. */}
                <button
                  type="button"
                  className="preview-open"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={(event) => openPlayground(feature.key, event.currentTarget.parentElement)}
                />
              </div>
              {preview.key === "compare" && (
                <div className="compare-stickers" aria-hidden="true">
                  <span className="kept-sticker">
                    <DemoCursor className="dl" />
                    <span className="kept-label dl">
                      <Star />
                      <span className="kept-long">Coral editorial · kept</span>
                      <span className="kept-short">Kept</span>
                    </span>
                  </span>
                  <span className="diff-badge dl">
                    <span className="diff-badge-icon"><Diff /></span>
                    2 directions · 3 differences
                  </span>
                </div>
              )}
              <button
                type="button"
                className="preview-expand"
                aria-label={`Open ${preview.label} in Playground`}
                onClick={(event) => openPlayground(feature.key, event.currentTarget.parentElement?.querySelector(".live-preview"))}
              >
                <Expand />
                Open in Playground
              </button>
            </BrandField>
            </div>
            ))}
            <button
              type="button"
              className="feature-playground-link"
              onClick={() => openPlayground(feature.key)}
            >
              Try the Playground
              <ArrowRight />
            </button>
          </div>
          <button
            type="button"
            className="scroll-hint"
            style={{ "--scroll-direction": direction } as React.CSSProperties}
            onClick={() => active < features.length - 1 ? setActive(active + 1) : exit()}
            disabled={leaving || active !== displayed}
            tabIndex={pinned ? 0 : -1}
            aria-hidden={!pinned}
            aria-label={active < features.length - 1 ? `Explore next step: ${features[active + 1].label}` : "Finish exploring and continue to page"}
          >
            <span className="scroll-hint-arrow" aria-hidden="true">
              {direction < 0 ? <ArrowUp key={feature.key} /> : <ArrowDown key={feature.key} />}
            </span>
            <span>Scroll to explore</span>
            <span className="scroll-hint-count" role="status" aria-label={`Step ${displayed + 1} of ${features.length}`}>
              <span className="scroll-hint-digit" aria-hidden="true">
                <span className="scroll-hint-reel" style={{ transform: `translateY(-${displayed * 100 / features.length}%)` }}>
                  {features.map((item, index) => <span key={item.key}>{index + 1}</span>)}
                </span>
              </span>
              <span aria-hidden="true">/ {features.length}</span>
            </span>
          </button>
        </BrandField>
      </div>
    </section>
  );
}

function OutcomeCard({
  item,
  index,
  depth,
}: {
  item: (typeof outcomes)[number];
  index: number;
  depth: number;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <article
      className="outcome-card"
      data-stack-depth={depth}
      ref={ref}
      data-inview={inView}
    >
      <div className="outcome-copy">
        <div className="outcome-head">
          <h3>{item.title}</h3>
          <span className="outcome-index dl" aria-hidden="true">
            <b>0{index + 1}</b> {item.label}
          </span>
        </div>
        <p>{item.text}</p>
      </div>
      <BrandField
        className="outcome-art"
        patternX={item.x}
        patternY={item.y}
      >
        <item.art />
      </BrandField>
    </article>
  );
}

function Outcomes() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);
  useEffect(() => {
    const media = matchMedia("(max-width: 767px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!media.matches) return setActiveCard(0);
      const cards = [...(gridRef.current?.querySelectorAll<HTMLElement>(".outcome-card") ?? [])];
      const next = cards.reduce((current, card, index) => {
        const stickyTop = parseFloat(getComputedStyle(card).top) || 0;
        return card.getBoundingClientRect().top <= stickyTop + 1 ? index : current;
      }, 0);
      setActiveCard((current) => current === next ? current : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", schedule, { passive: true });
    media.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      media.removeEventListener("change", schedule);
    };
  }, []);
  return (
    <section id="why-varianthub" className="outcomes-section section-pad">
      <div className="section-container">
        <SectionHeading title="From first options to a clear direction.">
          Make decisions with the interface running, not just the idea of it.
        </SectionHeading>
        <div className="outcomes-grid" ref={gridRef}>
          {outcomes.map((item, index) => (
            <OutcomeCard
              key={item.title}
              item={item}
              index={index}
              depth={Math.max(0, activeCard - index)}
            />
          ))}
          <p className="outcomes-progress" aria-hidden="true">
            <span className="outcomes-dots">
              {outcomes.map((item, index) => (
                <i key={item.title} data-active={index === activeCard} />
              ))}
            </span>
            <span>
              0{activeCard + 1} of 0{outcomes.length} · {outcomes[activeCard].label}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

const integrations = [
  {
    key: "react",
    icon: Code2,
    shortLabel: "React",
    label: "Your React components",
    description: "The components your app already compiles.",
    file: "src/variants.tsx",
    language: "React",
    highlight: [8, 9],
    rendered: "Rendered in your app",
    renderedVariants: ["Quiet", "Bold"],
    code: `import { VariantHubProvider, VariantHubCanvasPage } from "varianthub-core";\nimport { QuietButton, BoldButton } from "./alternatives";\n\nconst actions = {\n  key: "primary-action",\n  name: "Primary action",\n  path: "src/alternatives",\n  variants: [\n    { id: "quiet", name: "Quiet", component: QuietButton },\n    { id: "bold", name: "Bold", component: BoldButton },\n  ],\n};\n\n<VariantHubProvider>\n  <VariantHubCanvasPage componentsWithVariants={[actions]}\n    getComponentVariants={key => key === actions.key ? actions : undefined} />\n</VariantHubProvider>`,
  },
  {
    key: "html",
    icon: FileCode2,
    shortLabel: "HTML pages",
    label: "Your HTML pages",
    description: "Local pages, assets and real navigation.",
    file: "varianthub.config.json",
    language: "HTML",
    highlight: [3, 8],
    rendered: "Rendered from your pages",
    renderedVariants: ["Quiet", "Bold"],
    code: `// varianthub.config.json · an exploration's variants\n"variants": [\n  {\n    "id": "quiet",\n    "name": "Quiet direction",\n    "source": { "type": "html", "entry": "pages/quiet.html" }\n  },\n  {\n    "id": "bold",\n    "name": "Bold direction",\n    "source": { "type": "html", "entry": "pages/bold.html" }\n  }\n]`,
  },
  {
    key: "url",
    icon: Globe,
    shortLabel: "Live URLs",
    label: "Your running URLs",
    description: "Bring an existing preview into the workspace.",
    file: "varianthub.config.json",
    language: "URL",
    highlight: [3, 7],
    rendered: "Loaded from localhost:3000",
    renderedVariants: ["Local preview"],
    code: `// Register an already-running preview\n"variants": [\n  {\n    "id": "local-preview",\n    "name": "Local preview",\n    "source": {\n      "type": "url",\n      "url": "http://localhost:3000/alternatives/quiet"\n    }\n  }\n]\n\n// Keep the source server running.\n// The page must allow embedding.`,
  },
];
function CodeAdvantage() {
  const [selected, setSelected] = useState("react");
  const tabsRef = useRef<HTMLDivElement>(null);
  const [stageRef, stageInView] = useInView();
  const { displayed, leaving, direction } = useSwitchMotion(integrations.findIndex((item) => item.key === selected));
  const item = integrations[displayed];
  useEffect(() => {
    if (!matchMedia("(max-width: 767px)").matches) return;
    const tabs = tabsRef.current;
    const tab = document.getElementById(`integration-${selected}`);
    if (!tabs || !tab) return;
    tabs.scrollTo({
      left: tab.offsetLeft - (tabs.clientWidth - tab.offsetWidth) / 2,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [selected]);
  return (
    <section className="code-section section-pad">
      <div className="section-container">
        <SectionHeading title="The comparison lives in your code.">
          Design tools help explore what an interface could be. Here you compare
          implementations running in your project, with your styles, content and
          behavior.
        </SectionHeading>
        <Tabs
          value={selected}
          onValueChange={setSelected}
          orientation="vertical"
          className="integration-layout"
        >
          <div className="code-copy">
            <h3>Review the code you will keep.</h3>
            <p>
              A comparison workspace alongside your development flow. No
              separate mockup to rebuild before you can test a button or follow
              a link.
            </p>
            <TabsList ref={tabsRef} className="integration-tabs" aria-label="Integration type">
              {integrations.map((item) => (
                <TabsTrigger value={item.key} key={item.key} id={`integration-${item.key}`} aria-controls="integration-panel">
                  <span className={`integration-illustration ${item.key}`}>
                    <item.icon />
                    <i />
                    <i />
                  </span>
                  <span>
                    <strong>
                      <span className="integration-label-long">{item.label}</span>
                      <span className="integration-label-short">{item.shortLabel}</span>
                    </strong>
                    <small>{item.description}</small>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div
            className={`integration-detail${leaving ? " is-leaving" : ""}`}
            style={{ "--switch-direction": direction } as React.CSSProperties}
            ref={stageRef}
            data-inview={stageInView}
          >
            <BrandField className="integration-stage">
              <div className="code-stage-frame">
              <div key={item.key} className="integration-content" id="integration-panel" role="tabpanel" aria-labelledby={`integration-${item.key}`} tabIndex={0}>
                <div className="code-window">
                  <WindowChrome title={`Editor · your-app/${item.file}`} />
                  <div className="code-window-bar">
                    <span>{item.language}</span>
                    <CopyButton text={item.code} />
                  </div>
                  <pre tabIndex={0} aria-label={`${item.language} integration code`}>
                    <code>
                      {item.code.split("\n").map((line, index) => {
                        const order = item.highlight.indexOf(index);
                        return (
                          <span
                            key={index}
                            className={`code-line${order >= 0 ? " is-variant" : ""}`}
                            style={order >= 0 ? ({ "--line-order": order } as React.CSSProperties) : undefined}
                          >
                            {order >= 0 && <span className="code-line-band dl" aria-hidden="true" />}
                            {order >= 0 && <span className="code-line-marker dl" aria-hidden="true">+</span>}
                            {line || " "}
                          </span>
                        );
                      })}
                    </code>
                  </pre>
                  <p className="code-window-note">
                    Your components, styles and state. Nothing to rebuild.
                  </p>
                </div>
              </div>
              <div className="rendered-sticker dl" aria-hidden="true">
                <span className="rendered-sticker-label">
                  <i />
                  {item.rendered}
                </span>
                <span className="rendered-sticker-variants">
                  {item.renderedVariants.map((name, index) => (
                    <b key={name} data-tone={index === 0 ? "quiet" : "bold"}>{name}</b>
                  ))}
                </span>
              </div>
              </div>
            </BrandField>
          </div>
        </Tabs>
      </div>
    </section>
  );
}

function Organization({ openPlayground }: { openPlayground: () => void }) {
  const [chooserRef, chooserInView] = useInView<HTMLElement>();
  const [searchRef, searchInView] = useInView<HTMLElement>();
  return (
    <section id="workspace" className="organization-section section-pad">
      <div className="section-container">
        <SectionHeading title="Keep the useful options within reach." left>
          An exploration can grow without filling your workspace. Choose what
          stays visible, save favorites and find another item from the keyboard.
        </SectionHeading>
        <div className="organization-grid">
          <article ref={chooserRef} data-inview={chooserInView}>
            <h3>Choose what you compare.</h3>
            <BrandField
              className="organization-art"
              patternX={-230}
              patternY={-10}
            >
              <button
                onClick={openPlayground}
                aria-label="Try selecting variants in the playground"
              >
                <Image
                  src="/brand/variant-chooser.png"
                  width={968}
                  height={796}
                  alt="Variant chooser with visibility toggles and selected alternatives"
                />
              </button>
              <span className="visible-chip dl" aria-hidden="true">
                <span className="visible-bars">
                  <i className="dl" />
                  <i className="dl" />
                  <i className="dl" />
                  <i />
                </span>
                3 of 20 visible
              </span>
            </BrandField>
            <p>
              Hide an option from the workspace without removing it from the
              catalog. Select the visible versions you want to compare.
            </p>
          </article>
          <article ref={searchRef} data-inview={searchInView}>
            <h3>Find the next thing to work on.</h3>
            <BrandField
              className="organization-art"
              patternX={15}
              patternY={90}
            >
              <button
                onClick={openPlayground}
                aria-label="Try searching the playground"
              >
                <Image
                  src="/brand/workspace-search.png"
                  width={1016}
                  height={1024}
                  alt="Workspace search with recent items and favorites"
                />
              </button>
              <span className="keycaps" aria-hidden="true">
                <kbd className="dl">⌘</kbd>
                <kbd className="dl">K</kbd>
              </span>
            </BrandField>
            <p>
              Open search with <kbd>⌘ K</kbd>, jump to a recent item or return
              to a favorite. Spend less time looking through the catalog.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

const skills = [
  {
    key: "builder",
    name: "VariantHub Builder",
    shortName: "Set up",
    skill: "varianthub-builder",
    title: "Get your repo ready.",
    description:
      "Ask your agent to install or update VariantHub. The skill connects the registry and preview routes, then checks that components and pages open correctly.",
    tasks: [
      "Installation and updates",
      "Registry and preview routes",
      "Checks on the running workspace",
    ],
    greeting: "What would you like to set up?",
    prompt:
      "Use varianthub-builder to set up VariantHub in this repo. Register a sample component and a page, then check that both previews open.",
    answer:
      "VariantHub is ready in this repository. I added a sample component and page to the registry, then opened both previews to check they load.",
    steps: [
      ["Installed VariantHub and the registry", "4s"],
      ["Registered PrimaryAction and Northstar page", "9s"],
    ],
    compactStep: "Installed and registered samples",
    activeStep: ["Opening both previews…", "Opened both previews", "localhost:3000"],
  },
  {
    key: "explore",
    name: "VariantHub",
    shortName: "Explore",
    skill: "varianthub",
    title: "Explore another direction.",
    description:
      "Describe the change you want to try. Your agent creates alternatives, registers them in the workspace and keeps your production code intact.",
    tasks: [
      "Real component and page variants",
      "Registered and ready to compare",
      "Experiments kept outside production imports",
    ],
    greeting: "What would you like to explore?",
    prompt:
      "Use varianthub to create two alternatives for our hero. Keep one quiet and make the other more expressive. Reuse our tokens, register both and give me the comparison URL.",
    answer:
      "Both directions are ready to compare. I reused the project tokens and registered Quiet and Expressive as separate variants. Your existing hero is unchanged.",
    steps: [
      ["Created Quiet and Expressive heroes", "12s"],
      ["Registered both in the workspace", "5s"],
    ],
    compactStep: "Created and registered both heroes",
    activeStep: ["Opening the comparison…", "Opened the comparison", "localhost:4310"],
  },
];
function AgentConversation({ skill }: { skill: (typeof skills)[number] }) {
  const [status, setStatus] = useState<"ready" | "typing" | "done">("ready");
  const [length, setLength] = useState(0);
  useEffect(() => {
    if (status !== "typing") return;
    let current = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = setInterval(() => {
      current = reduced
        ? skill.answer.length
        : Math.min(current + 4, skill.answer.length);
      setLength(current);
      if (current === skill.answer.length) {
        setStatus("done");
        clearInterval(interval);
      }
    }, 24);
    return () => clearInterval(interval);
  }, [status, skill.answer]);
  return (
    <div className="agent-window">
      <WindowChrome title="Your coding agent · Example conversation" />
      <div className="chat-body">
        <p className="agent-greeting">
          <Sparkles />
          {skill.greeting}
        </p>
        <div className="prompt-bubble">{skill.prompt}</div>
        <CopyButton text={skill.prompt} label="Copy prompt" />
        <div className="agent-run">
          <p className="agent-run-head dl">
            <Sparkles />
            <strong>{skill.skill}</strong>
            <span>· {status === "done" ? "done" : "working"}</span>
          </p>
          <ol>
            {skill.steps.map(([label, time], index) => (
              <li key={label} className="agent-run-step is-done run-full dl" style={{ "--step": index } as React.CSSProperties}>
                <span className="run-icon dl"><Check /></span>
                <span>{label}</span>
                <small>{time}</small>
              </li>
            ))}
            <li className="agent-run-step is-done run-compact dl">
              <span className="run-icon dl"><Check /></span>
              <span>{skill.compactStep}</span>
            </li>
            <li
              className={`agent-run-step dl ${status === "done" ? "is-done" : "is-active"}`}
              style={{ "--step": skill.steps.length } as React.CSSProperties}
            >
              {status === "done" ? (
                <span className="run-icon"><Check /></span>
              ) : (
                <span className="run-spinner" />
              )}
              <span>{status === "done" ? skill.activeStep[1] : skill.activeStep[0]}</span>
              <code>{skill.activeStep[2]}</code>
            </li>
          </ol>
        </div>
        {status !== "ready" && (
          <div className="agent-answer">
            <Sparkles />
            <p aria-hidden="true">
              {skill.answer.slice(0, length)}
              {status === "typing" && <span className="typing-caret" />}
            </p>
            <span role="status" className="sr-only">
              {status === "done" ? skill.answer : "Agent is responding"}
            </span>
          </div>
        )}
      </div>
      <div className="chat-composer">
        <span>
          {status === "ready"
            ? "See what happens next"
            : "Example only · no files are changed"}
        </span>
        <Button
          size="sm"
          variant={status === "done" ? "secondary" : "default"}
          disabled={status === "typing"}
          onClick={() => {
            if (status === "done") {
              setLength(0);
              setStatus("ready");
            } else setStatus("typing");
          }}
        >
          {status === "done" ? <RotateCcw /> : <ArrowUp />}
          {status === "done"
            ? "Replay"
            : status === "typing"
              ? "Writing…"
              : "Send"}
        </Button>
      </div>
    </div>
  );
}
function AgentSkills() {
  const [selected, setSelected] = useState("builder");
  const { displayed, leaving, direction } = useSwitchMotion(selected === "builder" ? 0 : 1);
  const skill = skills[displayed];
  const [splitRef, splitInView] = useInView();
  return (
    <section id="agent-skills" className="agent-section section-pad">
      <div className="section-container">
        <SectionHeading
          title="Describe the change. Let your agent build the options."
        >
          Two skills bring VariantHub into your coding agent. Set up the
          workspace, ask for alternatives, then compare real interfaces without
          wiring each variant by hand.
        </SectionHeading>
        <Tabs value={selected} onValueChange={setSelected}>
          <TabsList
            className="segmented agent-selector"
            style={{ "--active-tab": selected === "builder" ? 0 : 1 } as React.CSSProperties}
            aria-label="Agent skill"
          >
            {skills.map((item) => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                id={`agent-tab-${item.key}`}
                aria-controls="agent-panel"
              >
                {item.key === "builder" ? <Terminal /> : <Sparkles />}
                <span className="agent-tab-long">{item.name}</span>
                <span className="agent-tab-short">{item.shortName}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div
            ref={splitRef}
            data-inview={splitInView}
            className={`agent-split ${leaving ? "is-leaving" : ""}`}
            style={{ "--switch-direction": direction } as React.CSSProperties}
            id="agent-panel"
            role="tabpanel"
            aria-labelledby={`agent-tab-${selected}`}
          >
            <div className="agent-copy" key={`copy-${skill.key}`}>
              <span className="skill-name">
                <Terminal />
                {skill.skill}
              </span>
              <h3>{skill.title}</h3>
              <p>{skill.description}</p>
              <h4>Your agent takes care of</h4>
              <ul>
                {skill.tasks.map((task) => (
                  <li key={task}>
                    <Check />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
            <BrandField className="agent-stage" key={`stage-${skill.key}`}>
              <AgentConversation key={skill.key} skill={skill} />
            </BrandField>
          </div>
        </Tabs>
      </div>
    </section>
  );
}
const questions = [
  [
    "Do I need to install anything to try it?",
    "The public playground includes sample projects you can explore in your browser. To compare your own work, run VariantHub in your project.",
  ],
  [
    "What can I compare?",
    "React components in their existing host, local HTML pages and running URLs that allow embedding. Compare a small interaction or navigate an entire page.",
  ],
  [
    "Is VariantHub a desktop app?",
    "It runs in your browser. The workspace is designed for a desktop-sized screen, with room to compare and arrange multiple previews. Your previews can still use Mobile, Tablet, Desktop and Wide viewports.",
  ],
  [
    "How many variants can I show?",
    "Keep up to 20 variants visible in a workspace. The registry can contain more; choose which ones you want to compare without deleting the others.",
  ],
  [
    "Does my project need a cloud account?",
    "No. The local runner works in your project without a cloud account. Your code and local previews stay on your machine. AI agents are optional and use their own providers.",
  ],
  [
    "Is VariantHub free and open source?",
    "Yes. VariantHub is free and open source under the MIT License. Clone it from GitHub, the only place it is distributed.",
  ],
];
function FAQ() {
  return (
    <section id="faq" className="faq-section section-pad">
      <SectionHeading title="A few things before you start.">
        What runs where, what stays local, and how to get started.
      </SectionHeading>
      <Accordion
        type="single"
        collapsible
        defaultValue="faq-0"
        className="faq-list"
      >
        {questions.map(([question, answer], index) => (
          <AccordionItem key={question} value={`faq-${index}`}>
            <AccordionTrigger>{question}</AccordionTrigger>
            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function MarketingLanding() {
  const [playground, setPlayground] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [installPinned, setInstallPinned] = useState(false);
  const [reset, setReset] = useState(0);
  const [closingRef, closingInView] = useInView();
  const trigger = useRef<HTMLElement | null>(null);
  const [playgroundOrigin, setPlaygroundOrigin] = useState("inset(85% 35% 5% 35% round 12px)");
  const openPlayground = (mode = "catalog", origin?: Element | null) => {
    trigger.current = document.activeElement as HTMLElement;
    const rect = (origin ?? trigger.current)?.getBoundingClientRect();
    if (rect && rect.width && rect.height) {
      const w = innerWidth - 32, h = innerHeight - 32;
      const clamp = (n: number) => Math.max(0, Math.min(100, n));
      setPlaygroundOrigin(`inset(${clamp((rect.top - 16) / h * 100)}% ${clamp((innerWidth - 16 - rect.right) / w * 100)}% ${clamp((innerHeight - 16 - rect.bottom) / h * 100)}% ${clamp((rect.left - 16) / w * 100)}% round 12px)`);
    }
    setPlayground(mode);
  };
  return (
    <div className="marketing" id="top" onClick={(event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const id = link.hash.slice(1);
      if (!document.getElementById(id)) return;
      event.preventDefault();
      scrollToSection(id);
    }}>
      <a href="#why-varianthub" className="skip-link">
        Skip to content
      </a>
      <Header
        openPlayground={() => openPlayground()}
        hidden={pinned || installPinned}
      />
      <main>
        <Hero openPlayground={openPlayground} onPinned={setPinned} />
        <Outcomes />
        <CodeAdvantage />
        <Organization openPlayground={() => openPlayground()} />
        <AgentSkills />
        <Installation onPinned={setInstallPinned} />
        <FAQ />
        <BrandField className="closing-field">
          <div className="closing-stack" ref={closingRef} data-inview={closingInView}>
          <div className="closing-variant variant-a dl" aria-hidden="true">
            <span className="closing-variant-label"><span>A · Cobalt focus</span><i /></span>
            <span className="closing-variant-media" />
            <span className="closing-variant-line" />
            <span className="closing-variant-line short" />
            <span className="closing-variant-action" />
          </div>
          <div className="closing-variant variant-b dl" aria-hidden="true">
            <span className="closing-variant-label"><span>B · Coral editorial</span><Star /></span>
            <strong>Make the next move feel inevitable.</strong>
            <span className="closing-variant-line" />
            <span className="closing-variant-line short" />
            <span className="closing-variant-action" />
          </div>
          <div className="closing-card glass">
          <VariantHubMark motion="loop" className="closing-mark" />
          <h2>
            Find the direction
            <br />
            worth shipping.
          </h2>
          <p>
            Start with the sample project. See the whole page, test the details,
            then bring your own work.
          </p>
          <Button
            size="lg"
            onClick={() => openPlayground()}
          >
            <SquareMousePointer />
            Explore the playground
          </Button>
          </div>
          </div>
        </BrandField>
      </main>
      <footer className="site-footer">
        <div className="footer-main section-container">
          <div>
            <a href="#top" className="brand" aria-label="VariantHub" data-mark-trigger>
              <VariantHubMark motion="hover" className="brand-mark" />
              <VariantHubWordmark className="brand-wordmark" />
            </a>
            <p>
              A place to compare the interfaces
              <br />
              you are already building.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <a href="#why-varianthub">Why VariantHub</a>
            <a href="#workspace">Workspace</a>
            <a href="#agent-skills">Agent skills</a>
          </div>
          <div>
            <h3>Project</h3>
            <a href="#installation">Installation</a>
            <button onClick={() => openPlayground()}>Playground</button>
            <a href="https://github.com/mattiamichini-design/varianthub" target="_blank" rel="noopener">
              GitHub
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>VariantHub · Free and open source under the MIT License.</span>
          <span>
            Made by{' '}
            <a href="https://mattiamichini.com" target="_blank" rel="noopener">
              Mattia
            </a>
          </span>
        </div>
      </footer>
      <Dialog
        open={playground !== null}
        onOpenChange={(open) => {
          if (!open) setPlayground(null);
        }}
      >
        <DialogContent
          className="marketing playground-dialog"
          style={{ "--playground-origin": playgroundOrigin } as React.CSSProperties}
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle className="sr-only">VariantHub playground</DialogTitle>
          <DialogDescription className="sr-only">
            Try the sample workspace. Close to return to the landing page, or
            choose Install.
          </DialogDescription>
          <div className="playground-toolbar">
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                <X />
                <span>Back to page</span>
              </Button>
            </DialogClose>
            <span className="playground-address">
              <VariantHubMark className="brand-mark" />VariantHub / Playground
            </span>
            <div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  for (const mode of [
                    "catalog",
                    "compare",
                    "arrange",
                    "test",
                    "keep",
                  ]) {
                    localStorage.removeItem(`varianthub-public-${mode}`);
                    localStorage.removeItem(`varianthub-public-${mode}:varianthub-public-demo`);
                    localStorage.removeItem(`varianthub-public-${mode}:varianthub-public-demo:visits`);
                  }
                  for (const key of Object.keys(sessionStorage)) {
                    if (key.startsWith("varianthub:varianthub-public-demo:")) sessionStorage.removeItem(key);
                  }
                  setReset((value) => value + 1);
                }}
              >
                <RotateCcw />
                <span>Reset demo</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setPlayground(null);
                  requestAnimationFrame(() =>
                    scrollToSection("installation"),
                  );
                }}
              >
                <Download />
                Install
              </Button>
            </div>
          </div>
          {playground && (
            <iframe
              key={`${playground}-${reset}`}
              src={`/playground?mode=${playground}`}
              title="Interactive VariantHub playground"
              className="playground-frame"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
