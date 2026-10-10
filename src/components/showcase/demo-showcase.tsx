"use client";

import { ArrowRight, ArrowUpRight, Check, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";
import styles from "./demo-showcase.module.css";

type Tone = "slate" | "blue" | "violet" | "amber";

const actionContent = {
  slate: { title: "Ready when you are", body: "Review the final notes, then share this direction with your team.", action: "Open review", done: "Review opened", meta: ["Draft saved", "4 notes", "2 reviewers"] },
  blue: { title: "Move this concept forward", body: "Everything is aligned. Invite the team to make the final call.", action: "Request approval", done: "Approval sent", meta: ["Approval requested", "Due today", "3 stakeholders"] },
  violet: { title: "Publish the new direction", body: "Your preview is live, checked, and ready for the first audience.", action: "Publish preview", done: "Preview published", meta: ["Launch window", "All checks passed", "Live link ready"] },
} as const;

export function DemoActionSurface({ tone }: { tone: Exclude<Tone, "amber"> }) {
  const [complete, setComplete] = useState(false);
  const content = actionContent[tone];
  return <div className={`${styles.root} ${styles.actionStage}`}>
    <section className={`${styles.actionPanel} ${styles[`action${tone[0].toUpperCase()}${tone.slice(1)}`]}`} data-complete={complete}>
      <div className={styles.actionMeta}><span className={styles.actionContext}><span aria-hidden="true">● </span>{content.meta[0]}</span><span>{content.meta.slice(1).join(" · ")}</span></div>
      <div className={styles.actionCopy}><h2 className={styles.actionTitle}>{content.title}</h2><p className={styles.actionBody}>{content.body}</p></div>
      <div className={styles.actionRow}>
        <button type="button" className={styles.actionButton} onClick={() => setComplete(value => !value)}>{complete ? content.done : content.action}{complete ? <Check size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}</button>
        <p className={styles.actionStatus} role="status" aria-live="polite">{complete ? "Status updated" : "Ready to continue"}</p>
      </div>
    </section>
  </div>;
}

const cardContent = {
  slate: { label: "Team velocity", metric: "+28%", metricCopy: "faster from first sketch to an approved direction", title: "A calmer path to consensus", copy: "Compare live ideas in context, keep decisions visible, and give every review a clear next step.", facts: [["Review cycle", "2.4 days"], ["Open notes", "4"]] },
  amber: { label: "Signal report", metric: "8.7", metricCopy: "average confidence after the latest review round", title: "The direction is getting sharper", copy: "The strongest idea now leads on clarity and recall. One accessibility note remains before handoff.", facts: [["Confidence", "High"], ["Next review", "Thu 10:00"]] },
} as const;

export function DemoInformationCard({ tone }: { tone: "slate" | "amber" }) {
  const content = cardContent[tone];
  return <div className={`${styles.root} ${styles.cardStage}`}>
    <article className={`${styles.infoCard} ${styles[`card${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>
      <div className={styles.cardTop}><span>{content.label}</span><Sparkles size={18} strokeWidth={1.5} aria-hidden="true" /></div><div className={styles.cardMetric}><strong>{content.metric}</strong><span>{content.metricCopy}</span></div>
      <div className={styles.cardContent}><h2>{content.title}</h2><p>{content.copy}</p></div><dl className={styles.cardFacts}>{content.facts.map(([label, value]) => <div className={styles.cardFact} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </article>
  </div>;
}

function LandingHeader() {
  return <header className={styles.landingHeader}><a href="#top" className={styles.brand}><ArrowUpRight className={styles.brandMark} size={28} aria-hidden="true" />Northstar</a><nav className={styles.landingNav} aria-label="Demo page navigation"><a href="#story">Story</a><a href="#details">Explore details</a><a href="https://example.com" target="_blank" rel="noreferrer">Visit example.com ↗</a></nav></header>;
}

const story = [
  ["See what matters", "Bring the strongest ideas into one calm, shared view."],
  ["Feel the difference", "Review real interfaces instead of explaining static pictures."],
  ["Leave with clarity", "Capture the choice and the reasoning while the context is fresh."],
];

function StorySection() {
  return <section id="story" className={styles.storyWrap}><div className={styles.storyGrid}>{story.map(([title, copy], index) => <article key={title}><span className={styles.storyNumber}>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{copy}</p></article>)}</div></section>;
}

function LandingDetails() {
  return <section id="details" className={styles.details}><h2>Make room for the idea that changes the room.</h2><div className={styles.detailsCopy}><p>Northstar keeps the work live from first sketch to final decision. Every route, interaction, and breakpoint is part of the conversation.</p><a href="#top" className={styles.backLink}>Back to top ↑</a></div></section>;
}

export function NorthstarLanding({ accent }: { accent: "cobalt" | "coral" | "lime" }) {
  return <div id="top" className={`${styles.root} ${styles.landing} ${styles[accent]}`}><LandingHeader />
    <main><section className={styles.landingHero}>
      <h1 className={styles.landingTitle}>{accent === "cobalt" ? <>Make the next<br />move obvious.</> : accent === "coral" ? <>Ideas deserve<br />room to breathe.</> : <>Turn up<br />the signal.</>}</h1>
      <div className={styles.heroCopy}><p className={styles.landingLead}>{accent === "cobalt" ? "Turn competing ideas into clear choices with live comparisons your whole team can understand." : accent === "coral" ? "Shape, compare, and discuss each direction in the same medium your customers will experience it." : "Stop reviewing ideas at a distance. Put every direction live, side by side, and make the call."}</p><a href="#story" className={styles.landingCta}>{accent === "cobalt" ? "Explore the story" : accent === "coral" ? "Read our approach" : "Enter Northstar"}<ArrowUpRight size={16} aria-hidden="true" /></a></div>
      </section>
      {accent === "cobalt" ? <div className={styles.orbitArt} aria-hidden="true"><i /><i /><i /></div> : accent === "coral" ? <div className={styles.editorialStamp} aria-hidden="true"><strong>Room to think.</strong><span>Live ideas.<br />Honest reactions.<br />Better decisions.</span></div> : <div className={styles.signalArt} aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>}
      <StorySection /><LandingDetails /></main>
    <footer id="bottom" className={styles.landingFooter}><span>Northstar / VariantHub showcase</span><span>Designed for better decisions.</span></footer>
  </div>;
}

const responsiveThemes = ["#2858ff", "#6d3df5", "#e25236", "#087e68", "#a243db", "#cb3d69", "#346879", "#7b5c26", "#445bdb", "#167350", "#9b432f", "#5750be"];
const responsiveGoals = ["Launch a confident product story", "Find the clearest positioning", "Plan a focused campaign", "Shape a memorable editorial system"];

export function ResponsiveFixture({ index }: { index: number }) {
  const [prepared, setPrepared] = useState(false);
  const accent = responsiveThemes[(index - 1) % responsiveThemes.length];
  const goal = responsiveGoals[(index - 1) % responsiveGoals.length];
  return <main id="top" className={`${styles.root} ${styles.responsivePage}`} style={{ "--accent": accent, "--accent-ink": index === 3 ? "#171717" : "#fff", "--accent-link": index === 3 ? "#b83b24" : accent, "--details-link": index === 3 ? "#b83b24" : "#171717" } as React.CSSProperties}>
    <style>{`[data-responsive-label]::after{content:"Mobile"}@media(min-width:640px){[data-responsive-label]::after{content:"Tablet"}}@media(min-width:1024px){[data-responsive-label]::after{content:"Desktop"}}@media(min-width:1600px){[data-responsive-label]::after{content:"Wide"}}`}</style>
    <div className={styles.responsiveShell}><section className={styles.responsiveHero}><h1>{goal}</h1><p>A useful brief is specific enough to guide the work and open enough to leave space for a better answer.</p><div className={styles.responsiveHeroTop}><p>Creative brief {String(index).padStart(2, "0")}</p><p data-responsive-label aria-label="Viewport breakpoint" className={styles.viewportLabel} /></div></section>
      <section className={styles.responsiveContent}><form className={styles.briefForm} onSubmit={event => { event.preventDefault(); setPrepared(true); }}><div className={styles.formSection}><h2>Set the direction</h2><div className={styles.fieldGrid}><label className={`${styles.field} ${styles.fieldWide}`}>Workspace note<input aria-label="Workspace note" placeholder="Type to check live state" /></label><label className={styles.field}>Audience<span className="vh-select"><select defaultValue="product"><option value="product">Product teams</option><option value="studio">Creative studios</option><option value="founders">Founders</option></select><ChevronDown aria-hidden="true" /></span></label><label className={styles.field}>Decision date<input type="date" defaultValue="2026-10-08" /></label><label className={`${styles.field} ${styles.fieldWide}`}>What should people remember?<textarea defaultValue="A faster way to compare live ideas and make a confident decision." /></label></div></div><button type="submit" className={styles.formButton} aria-live="polite">{prepared ? <Check size={17} aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}{prepared ? "Brief ready" : "Prepare direction"}</button></form>
        <aside className={styles.briefAside}><div className={styles.summaryCard}><h2>Direction summary</h2><p>A compact readout for the team before the first review begins.</p><ul className={styles.summaryList}><li><span>Reviewers</span><strong>{2 + index % 4}</strong></li><li><span>Working session</span><strong>45 min</strong></li><li><span>Decision mode</span><strong>Focused</strong></li></ul></div><a href="#bottom" className={styles.jumpLink}>Jump to details ↓</a></aside></section>
      <section id="bottom" className={styles.responsiveDetails}><h2>Leave the room with a decision.</h2><p>Review the real experience, name the tradeoffs, and record the reason behind the final direction.</p><a href="#top">Back to top ↑</a></section>
    </div>
  </main>;
}

const growthNames = ["Signal", "Focus", "Orbit", "Tempo", "Frame", "Pulse"];

export function VariantGrowthFixture({ index }: { index: number }) {
  const hues = ["#3d63ff", "#7451e8", "#e3583f", "#0a8a71", "#be3c73", "#9b6b19"];
  return <div className={`${styles.root} ${styles.growthStage}`}><article className={styles.growthCard} style={{ "--growth-accent": hues[(index - 1) % hues.length] } as React.CSSProperties}><div className={styles.growthTop}><span className={styles.growthIndex}>{String(index).padStart(2, "0")}</span><span className={styles.growthSignal} aria-label="Strong signal"><i /><i /><i /><i /></span></div><div className={styles.growthCopy}><strong>{growthNames[(index - 1) % growthNames.length]} {Math.ceil(index / growthNames.length)}</strong><span>Exploration direction</span></div><div className={styles.growthFoot}><span>Ready to compare</span><b>{82 + index % 17}% match</b></div></article></div>;
}
