"use client";

import { ModerationMenu } from "@/components/ModerationMenu";

type Tone = "mod" | "founder" | "topics";

interface ModPageShellProps {
  title: string;
  subtitle?: string;
  tone?: Tone;
  children: React.ReactNode;
}

export function ModPageShell({
  title,
  subtitle,
  tone = "mod",
  children,
}: ModPageShellProps) {
  return (
    <div className="codex-mod-page mx-auto max-w-4xl space-y-6 pb-8">
      <header className={`codex-mod-header codex-mod-header-${tone}`}>
        <p className="codex-mod-eyebrow">
          {tone === "founder" ? "Founder" : "Moderation"}
        </p>
        <h1 className="codex-mod-title">{title}</h1>
        {subtitle && <p className="codex-mod-subtitle">{subtitle}</p>}
        <div className="mt-4">
          <ModerationMenu variant="pills" />
        </div>
      </header>
      {children}
    </div>
  );
}

export function ModSection({
  title,
  hint,
  badge,
  children,
}: {
  title: string;
  hint?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="codex-mod-section">
      <div className="codex-mod-section-head">
        <div>
          <h2 className="codex-mod-section-title">{title}</h2>
          {hint && <p className="codex-mod-section-hint">{hint}</p>}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

export function ModStatGrid({
  items,
  wide,
}: {
  items: { label: string; value: number | string; tone?: "default" | "warn" | "founder" }[];
  wide?: boolean;
}) {
  return (
    <div className={`codex-mod-stats${wide ? " codex-mod-stats--wide" : ""}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`codex-mod-stat${item.tone && item.tone !== "default" ? ` codex-mod-stat-${item.tone}` : ""}`}
        >
          <span className="codex-mod-stat-value">{item.value}</span>
          <span className="codex-mod-stat-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ModRow({ children, highlight }: { children: React.ReactNode; highlight?: "hidden" | "locked" }) {
  return (
    <div
      className={`codex-mod-row${highlight === "hidden" ? " codex-mod-row-hidden" : ""}${highlight === "locked" ? " codex-mod-row-locked" : ""}`}
    >
      {children}
    </div>
  );
}

export function ModEmpty({ children }: { children: React.ReactNode }) {
  return <p className="codex-mod-empty">{children}</p>;
}