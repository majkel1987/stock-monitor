import { Ellipsis, GripVertical } from "lucide-react";

import { SettingsTabs } from "@/components/settings/settings-tabs";
import {
  ActionButton,
  controlClass,
  Field,
  PageHeader,
  StatusBadge,
  Surface,
} from "@/components/ui/terminal";

const statuses = [
  [
    "Buy Candidate",
    "High priority",
    "bg-[var(--accent-primary)]",
    "BUY",
    "10",
    "YES",
  ],
  ["Watch", "Research list", "bg-[var(--info)]", "WATCH", "20", "YES"],
  [
    "Wait for Correction",
    "Valuation above level",
    "bg-[var(--warning)]",
    "WATCH",
    "30",
    "YES",
  ],
  [
    "Deep Dive",
    "Requires refreshed thesis",
    "bg-[var(--warning)]",
    "DEEP DIVE",
    "40",
    "YES",
  ],
  [
    "Portfolio",
    "Current holding",
    "bg-[var(--positive)]",
    "PORTFOLIO",
    "50",
    "YES",
  ],
  [
    "Hold",
    "Maintain without adding",
    "bg-[var(--positive)]",
    "PORTFOLIO",
    "60",
    "YES",
  ],
  [
    "Avoid",
    "Insufficient risk/reward",
    "bg-[var(--negative)]",
    "AVOID",
    "70",
    "YES",
  ],
  [
    "Kill the Thesis",
    "Thesis invalidated",
    "bg-[var(--negative)]",
    "AVOID",
    "80",
    "NO",
  ],
] as const;

const columns = "grid-cols-[34px_minmax(210px,1fr)_72px_170px_70px_70px_34px]";

export default function StatusSettingsPage() {
  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="Configure research workflow labels and data operations"
        title="Settings"
      >
        <ActionButton variant="primary">+ New status</ActionButton>
      </PageHeader>
      <SettingsTabs active="statuses" />
      <div className="grid h-[740px] grid-cols-[minmax(620px,838px)_330px] gap-4">
        <Surface>
          <div
            className={`grid h-[34px] items-center bg-[var(--bg-tertiary)] ${columns}`}
          >
            <span />
            {["Label", "Color", "Dashboard group", "Sort", "Active"].map(
              (label) => (
                <span
                  className="px-2 text-[9px] font-semibold text-[var(--text-muted)]"
                  key={label}
                >
                  {label}
                </span>
              ),
            )}
            <span />
          </div>
          {statuses.map(
            ([label, description, colorClass, group, sort, active], index) => (
              <div
                className={`grid h-[50px] items-center border-b border-[var(--border-subtle)] ${columns} ${index === 0 ? "bg-[var(--surface-selected)]" : ""}`}
                key={label}
              >
                <GripVertical
                  aria-hidden="true"
                  className="mx-auto size-[13px] text-[var(--text-muted)]"
                />
                <span className="flex min-w-0 flex-col px-2">
                  <strong className="truncate text-[11px] leading-[14px]">
                    {label}
                  </strong>
                  <span className="truncate text-[9px] leading-3 text-[var(--text-muted)]">
                    {description}
                  </span>
                </span>
                <span
                  className={`mx-2 h-[14px] w-7 rounded-[3px] ${colorClass}`}
                />
                <span className="px-2 text-[9px] font-semibold text-[var(--text-secondary)]">
                  {group}
                </span>
                <span className="px-2 font-mono text-[9px] font-semibold text-[var(--text-secondary)]">
                  {sort}
                </span>
                <span
                  className={`px-2 text-[9px] font-semibold ${active === "YES" ? "text-[var(--positive)]" : "text-[var(--text-muted)]"}`}
                >
                  {active}
                </span>
                <Ellipsis
                  aria-hidden="true"
                  className="size-[13px] text-[var(--text-muted)]"
                />
              </div>
            ),
          )}
        </Surface>
        <Surface className="flex flex-col gap-3 p-[14px]">
          <h2 className="text-[13px] leading-[17px] font-semibold">
            Edit status
          </h2>
          <p className="text-[10px] leading-[13px] text-[var(--text-muted)]">
            Statuses are configurable records. Labels may change without
            altering the interface structure.
          </p>
          <Field label="Label">
            <input className={controlClass} defaultValue="Buy Candidate" />
          </Field>
          <Field label="Description">
            <input
              className={controlClass}
              defaultValue="High-priority accumulation candidate"
            />
          </Field>
          <Field label="Dashboard group">
            <select className={controlClass} defaultValue="Buy">
              <option>Buy</option>
              <option>Watch</option>
            </select>
          </Field>
          <Field label="Sort order">
            <input className={controlClass} defaultValue="10" type="number" />
          </Field>
          <label className="flex h-[18px] items-center gap-2">
            <input
              className="size-4 accent-[var(--accent-primary)]"
              defaultChecked
              type="checkbox"
            />
            <span className="text-xs">Active status</span>
          </label>
          <div className="flex h-[66px] flex-col gap-2 rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
            <span className="text-[9px] font-semibold text-[var(--text-muted)]">
              PREVIEW
            </span>
            <StatusBadge>BUY CANDIDATE</StatusBadge>
          </div>
          <div className="flex h-8 gap-2">
            <ActionButton className="flex-1" variant="ghost">
              Cancel
            </ActionButton>
            <ActionButton className="flex-1" variant="primary">
              Save changes
            </ActionButton>
          </div>
        </Surface>
      </div>
    </div>
  );
}
