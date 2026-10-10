"use client";

import { useEffect, useState } from "react";
import {
  Terminal,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BrandField,
  SectionHeading,
  SetupArt,
  WindowChrome,
  CopyButton,
} from "./elements";
import { useScrollSequence, useSwitchMotion, scrollToSection } from "./scroll-sequence";
import { useInView } from "./use-in-view";

const managers = ["GitHub"];
const instructions = [
  {
    title: "Start with your project.",
    manual:
      "Add VariantHub to an existing project. Initialize a workspace alongside the code you already have.",
    ai: "Your agent chooses the right integration for this repository.",
  },
  {
    title: "Add a few alternatives.",
    manual:
      "Give each direction a stable ID and a source. Register local HTML pages, running URLs or components in your React host.",
    ai: "Describe the directions you want to explore. Your agent creates and registers them.",
  },
  {
    title: "Open your workspace.",
    manual:
      "Start the local runner, then open your workspace in the browser. Your project stays on your machine.",
    ai: "Ask your agent to start the workspace and check that every preview opens.",
  },
];
const prompts = [
  "Use varianthub-builder to set up VariantHub in this repository. Clone and build mattiamichini-design/varianthub from GitHub, the only distribution channel. Read the project documentation and run the checkout CLI with this project root.\n\nChoose the HTML/URL runner or the existing React host. Install both bundled skills in the project skills directory. Preserve existing configuration and routes.",
  "Use varianthub to create two alternatives for our landing page. Reuse this project's design tokens and source type.\n\nRegister both alternatives with stable IDs and names. Keep existing variants and production files intact. Check the previews and give me the exploration URL.",
  "Use varianthub to open the workspace for this project. Start the configured development server if needed.\n\nCheck the registered previews and give me the local workspace URL. Keep my existing variants and saved layouts intact.",
];
const registry = `{
  "version": 1,
  "projectId": "my-project",
  "roots": ["pages"],
  "explorations": [{
    "key": "landing",
    "name": "Landing page",
    "path": "pages",
    "kind": "page",
    "variants": [
      { "id": "quiet", "name": "Quiet",
        "source": { "type": "html", "entry": "pages/quiet.html" } },
      { "id": "bold", "name": "Bold",
        "source": { "type": "html", "entry": "pages/bold.html" } }
    ]
  }]
}`;
const html = `<!-- pages/quiet.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="./styles.css" />
    <title>Quiet direction</title>
  </head>
  <body>
    <main>
      <h1>A little room to think.</h1>
      <button type="button">Get started</button>
    </main>
  </body>
</html>`;
const reactCode = `// In your existing React host
import { VariantHubCanvasPage } from "varianthub-core";
import { QuietButton, BoldButton } from "./alternatives";

const action = {
  key: "action",
  name: "Primary action",
  path: "src/alternatives",
  variants: [
    { id: "quiet", name: "Quiet", component: QuietButton },
    { id: "bold", name: "Bold", component: BoldButton },
  ],
};

// Render inside your VariantHubProvider.
export function Workspace() {
  return <VariantHubCanvasPage componentsWithVariants={[action]}
    getComponentVariants={key => key === action.key ? action : undefined} />;
}`;

export function Installation({
  onPinned,
}: {
  onPinned: (value: boolean) => void;
}) {
  const [selectedMethod, setMethod] = useState("manual");
  const { displayed, leaving, direction } = useSwitchMotion(selectedMethod === "manual" ? 0 : 1);
  const method = displayed === 0 ? "manual" : "ai";
  const manager = "GitHub";
  const [source, setSource] = useState("Registry");
  const { ref, active, setActive, pinned } = useScrollSequence(3, true);
  const [terminalRef, terminalInView] = useInView();
  useEffect(() => onPinned(pinned), [pinned, onPinned]);
  const install = "git clone https://github.com/mattiamichini-design/varianthub.git\ncd varianthub\nnpm ci\nnpm run build:packages\nnode packages/runner/src/cli.mjs init --root /path/to/your-project";
  const start = "node /path/to/varianthub/packages/runner/src/cli.mjs start --root /path/to/your-project";
  useEffect(() => {
    const contents = ref.current?.querySelectorAll<HTMLElement>(".install-open-content");
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const panel = entry.target.closest<HTMLElement>(".install-panel");
        panel?.style.setProperty("--content-height", `${entry.target.getBoundingClientRect().height}px`);
      }
    });
    contents?.forEach(content => observer.observe(content));
    return () => observer.disconnect();
  }, [method, ref]);
  const codeFor = (step: number) =>
    step === 0
      ? install
      : step === 2
        ? start
        : source === "Registry"
          ? registry
          : source === "HTML"
            ? html
            : reactCode;
  return (
    <section id="installation" className="installation-section">
      <SectionHeading title="Bring the workspace to your project.">
        Choose how you want to work. Scroll through setup, alternatives and your
        first preview.
      </SectionHeading>
      <div
        ref={ref}
        className="install-scroll sequence-track"
        style={{ "--scene-step": active } as React.CSSProperties}
        data-pinned={pinned}
        id="installation-options"
        role="tabpanel"
        aria-labelledby={`method-${method}`}
      >
        <BrandField className="install-field">
          <Button variant="ghost" className="back-to-page install-close" aria-label="Close installation preview" tabIndex={pinned ? 0 : -1} aria-hidden={!pinned} onClick={() => scrollToSection("faq")}>
            <X />
          </Button>
      <Tabs value={selectedMethod} onValueChange={setMethod} className="method-tabs">
        <TabsList aria-label="Installation method" className="segmented" style={{ "--active-tab": selectedMethod === "manual" ? 0 : 1 } as React.CSSProperties}>
          <TabsTrigger
            value="manual"
            id="method-manual"
            aria-controls="installation-options"
          >
            <Terminal />
            Do it yourself
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            id="method-ai"
            aria-controls="installation-options"
          >
            <Sparkles />
            Use an AI agent
          </TabsTrigger>
        </TabsList>
      </Tabs>

          <div className={`install-steps ${leaving ? "is-leaving" : ""}`} style={{ "--switch-direction": direction } as React.CSSProperties}>
            {instructions.map((step, stepIndex) => (
              <div
                className={`install-step ${active === stepIndex ? "is-open" : ""}`}
                key={step.title}
                style={{ "--step-reveal": `var(--reveal-${stepIndex}, ${active === stepIndex ? 1 : 0})` } as React.CSSProperties}
              >
                <h3>
                  <button
                    type="button"
                    aria-label={step.title}
                    id={`install-trigger-${stepIndex}`}
                    aria-expanded={active === stepIndex}
                    aria-controls={`install-panel-${stepIndex}`}
                    onClick={() => setActive(stepIndex)}
                  >
                    <span className="step-number">{stepIndex + 1}</span>
                    <span className="step-title">{step.title}</span>
                    <ChevronDown />
                  </button>
                </h3>
                <div
                  id={`install-panel-${stepIndex}`}
                  role="region"
                  aria-labelledby={`install-trigger-${stepIndex}`}
                  className="install-panel"
                  style={{ opacity: `var(--opacity-${stepIndex}, ${active === stepIndex ? 1 : 0})`, height: `calc(var(--reveal-${stepIndex}, ${active === stepIndex ? 1 : 0}) * var(--content-height, 540px))` }}
                  inert={active !== stepIndex}
                  aria-hidden={active !== stepIndex}
                >
                  <div className="install-panel-inner">
                    <div className="install-open-content" key={method}>
                      <div className="install-copy">
                        <p>{method === "ai" ? step.ai : step.manual}</p>
                        <SetupArt step={stepIndex} />
                      </div>
                      {method === "ai" ? (
                        <div className="agent-window installation-chat">
                          <WindowChrome title="Your coding agent · Prompt example" />
                          <div className="chat-body">
                            <p className="agent-greeting">
                              <Sparkles />
                              {stepIndex === 0
                                ? "What would you like to set up in this project?"
                                : stepIndex === 1
                                  ? "What would you like to compare?"
                                  : "Ready to open your workspace?"}
                            </p>
                            <div className="prompt-bubble">
                              {prompts[stepIndex]}
                            </div>
                            <CopyButton
                              text={prompts[stepIndex]}
                              label="Copy prompt"
                            />
                          </div>
                          <p className="window-note">
                            Copy the prompt into the agent working in your
                            repository.
                          </p>
                        </div>
                      ) : (
                        <div
                          className="terminal-window"
                          ref={stepIndex === 0 ? terminalRef : undefined}
                          data-inview={stepIndex === 0 ? terminalInView : undefined}
                        >
                          <WindowChrome
                            title={
                              stepIndex === 1
                                ? "Your project · Source files"
                                : "Terminal · your-project"
                            }
                          />
                          <Tabs
                            value={stepIndex === 1 ? source : manager}
                            onValueChange={
                              stepIndex === 1 ? setSource : undefined
                            }
                          >
                            <TabsList
                              aria-label={
                                stepIndex === 1
                                  ? "Source example"
                                  : "GitHub checkout"
                              }
                              className="terminal-tabs"
                            >
                              {(stepIndex === 1
                                ? ["Registry", "HTML", "React"]
                                : managers
                              ).map((value) => (
                                <TabsTrigger
                                  key={value}
                                  value={value}
                                  id={`code-tab-${stepIndex}-${value}`}
                                  aria-controls={`installation-code-${stepIndex}`}
                                >
                                  {value}
                                </TabsTrigger>
                              ))}
                            </TabsList>
                          </Tabs>
                          <div className="terminal-file">
                            <span>
                              {stepIndex === 1
                                ? source === "Registry"
                                  ? "varianthub.config.json"
                                  : source === "HTML"
                                    ? "pages/quiet.html"
                                    : "workspace.tsx"
                                : "~/your-project"}
                            </span>
                            <CopyButton text={codeFor(stepIndex)} label="Copy code" />
                          </div>
                          <pre
                            tabIndex={0}
                            aria-label="Installation code"
                            id={`installation-code-${stepIndex}`}
                            role="tabpanel"
                            aria-labelledby={`code-tab-${stepIndex}-${stepIndex === 1 ? source : manager}`}
                          >
                            <code>{codeFor(stepIndex)}</code>
                            {stepIndex === 0 && (
                              <span className="terminal-output">
                                <span className="dl">
                                  <span className="terminal-ok">✓</span> Workspace initialized
                                  <span className="terminal-output-long"> for ~/your-project</span>
                                </span>
                                <span className="dl terminal-output-long">
                                  <span className="terminal-ok">✓</span> Ready. Add your first alternatives next.
                                </span>
                                <span className="terminal-prompt dl" aria-hidden="true">
                                  ❯ <i />
                                </span>
                              </span>
                            )}
                          </pre>
                          {stepIndex === 2 && (
                            <div className="terminal-ready">
                              <Check />
                              <span>
                                Workspace ready
                                <br />
                                <strong>http://localhost:4310</strong>
                              </span>
                              <ExternalLink />
                            </div>
                          )}
                          <p className="terminal-note">
                            {stepIndex === 0
                              ? "Node.js 22+. Clone and build once from GitHub; run directly against your project."
                              : stepIndex === 1
                                ? "HTML files stay inside configured roots. React needs varianthub-core and preview routes in your existing host."
                                : "Open the URL printed by your server. Your React host may use a different port."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BrandField>
      </div>
      <div className="install-footnote">
        <p>
          Free and open source. Add VariantHub to your project, then open your
          workspace.
        </p>
        <p>
          Node.js 22+. AI is optional. Clone and build VariantHub from GitHub,
          then point it at your project root.
        </p>
      </div>
    </section>
  );
}
