import type { MouseEventHandler, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  description,
  children,
  compact = false,
  index = false,
  eyebrow,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  compact?: boolean;
  index?: boolean;
  eyebrow?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between border-b border-[var(--border-subtle)]",
        index ? "min-h-10 gap-3 pb-3" : "min-h-12 gap-4 pb-4",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? <span className="ui-eyebrow">{eyebrow}</span> : null}
        <h1
          className={cn(
            "font-semibold tracking-tight text-foreground",
            index || compact
              ? "text-[clamp(1.25rem,1.1rem+0.45vw,1.5rem)] leading-snug"
              : "text-page-title",
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            "max-w-2xl text-muted-foreground",
            index
              ? "truncate text-sm leading-normal"
              : compact
                ? "text-sm leading-normal"
                : "text-sm leading-relaxed",
          )}
        >
          {description}
        </p>
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </header>
  );
}

export function ActionButton({
  children,
  variant = "secondary",
  className,
  type = "button",
  form,
  disabled = false,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  className?: string;
  type?: "button" | "submit";
  form?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  "aria-label"?: string;
}) {
  const variants = {
    primary: "ui-button-primary",
    secondary: "ui-button-secondary",
    ghost: "ui-button-ghost",
    destructive:
      "border border-negative/40 bg-[var(--negative-subtle)] text-negative hover:bg-negative hover:text-primary-foreground",
  };
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "ui-button",
        variants[variant],
        disabled &&
          "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-70 hover:bg-muted hover:text-muted-foreground",
        className,
      )}
      disabled={disabled}
      form={form}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function Surface({
  children,
  className,
  padded = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card text-card-foreground shadow-[var(--shadow-sm)]",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  meta,
  className,
  action,
}: {
  title: string;
  meta?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-muted/60 px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="text-sm font-semibold leading-normal tracking-tight text-foreground">
          {title}
        </h2>
        {meta ? <div className="ui-meta">{meta}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function StatusBadge({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "info" | "warning" | "positive" | "negative" | "neutral";
}) {
  const tones = {
    accent:
      "border-primary/35 bg-[var(--accent-subtle)] text-primary before:bg-primary",
    info: "border-info/35 bg-card text-info before:bg-info",
    warning:
      "border-warning/35 bg-[var(--warning-subtle)] text-warning before:bg-warning",
    positive:
      "border-positive/35 bg-[var(--positive-subtle)] text-positive before:bg-positive",
    negative:
      "border-negative/35 bg-[var(--negative-subtle)] text-negative before:bg-negative",
    neutral:
      "border-border bg-muted text-muted-foreground before:bg-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2 text-xs font-semibold tracking-wide before:h-2 before:w-0.5 before:rounded-[1px]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function MetricStrip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className="metric-strip">
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone,
  embedded = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "positive" | "negative" | "warning";
  embedded?: boolean;
  className?: string;
}) {
  const valueTone = {
    default: "text-foreground",
    positive: "text-positive",
    negative: "text-negative",
    warning: "text-warning",
  }[tone ?? "default"];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 p-4",
        embedded
          ? "bg-transparent"
          : "rounded-[var(--radius-surface)] border border-border bg-card shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <span className="ui-meta font-medium tracking-wide">{label}</span>
      <div className={cn("ui-kpi", valueTone)}>{value}</div>
      {hint ? (
        <div className="text-sm leading-normal text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <h3 className="text-card-title">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="ui-label">{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "ui-control text-foreground placeholder:text-muted-foreground";
export const textareaClass =
  "min-h-[5.5rem] w-full resize-y rounded-[var(--radius-control)] border border-border bg-card p-3 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_22%,transparent)]";
