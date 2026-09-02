import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <header className="flex h-[54px] items-center justify-between">
      <div className="flex flex-col gap-[3px]">
        <h1
          className={cn(
            "font-semibold text-[var(--text-primary)]",
            compact ? "text-xl leading-[26px]" : "text-[22px] leading-[29px]",
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            "text-[var(--text-muted)]",
            compact ? "text-[11px] leading-[14px]" : "text-xs leading-4",
          )}
        >
          {description}
        </p>
      </div>
      {children ? (
        <div className="flex items-center gap-2">{children}</div>
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
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
  form?: string;
}) {
  const variants = {
    primary:
      "bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]",
    secondary:
      "border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]",
    ghost: "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
  };
  return (
    <button
      className={cn(
        "flex h-8 items-center justify-center rounded-[5px] px-3 text-xs font-semibold",
        variants[variant],
        className,
      )}
      form={form}
      type={type}
    >
      {children}
    </button>
  );
}

export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)]",
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
}: {
  title: string;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex h-9 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3",
        className,
      )}
    >
      <h2 className="text-xs leading-4 font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      {meta ? (
        <div className="text-[10px] leading-[13px] text-[var(--text-muted)]">
          {meta}
        </div>
      ) : null}
    </header>
  );
}

export function StatusBadge({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "info" | "warning" | "positive" | "negative";
}) {
  const tones = {
    accent:
      "border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--accent-primary)] before:bg-[var(--accent-primary)]",
    info: "border-[var(--info)] bg-[var(--surface-default)] text-[var(--info)] before:bg-[var(--info)]",
    warning:
      "border-[var(--warning)] bg-[var(--warning-subtle)] text-[var(--warning)] before:bg-[var(--warning)]",
    positive:
      "border-[var(--positive)] bg-[var(--positive-subtle)] text-[var(--positive)] before:bg-[var(--positive)]",
    negative:
      "border-[var(--negative)] bg-[var(--negative-subtle)] text-[var(--negative)] before:bg-[var(--negative)]",
  };
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-[4px] border px-[7px] text-[10px] font-semibold before:h-[10px] before:w-[3px] before:rounded-[1px]",
        tones[tone],
      )}
    >
      {children}
    </span>
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
    <label className={cn("flex min-w-0 flex-col gap-[5px]", className)}>
      <span className="text-[11px] leading-[14px] font-semibold text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export const controlClass =
  "h-[34px] w-full rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px] text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--focus)]";
export const textareaClass =
  "h-[76px] w-full resize-none rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-default)] p-[10px] text-xs leading-4 text-[var(--text-secondary)] outline-none focus:border-[var(--focus)]";
