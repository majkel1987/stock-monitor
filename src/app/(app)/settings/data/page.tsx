import { AlertTriangle } from "lucide-react";

import { SettingsTabs } from "@/components/settings/settings-tabs";
import {
  ActionButton,
  PageHeader,
  SectionHeader,
  Surface,
} from "@/components/ui/terminal";

const marketStatus = [
  ["GPW", "34 / 34", "SUCCESS", "Last update 01 Sep · 16:42", "0 failed"],
  ["USA", "40 / 44", "PARTIAL", "Last update 01 Sep · 16:42", "4 failed"],
  [
    "FX · USD/PLN",
    "1 / 1",
    "SUCCESS",
    "Last update 01 Sep · 16:00",
    "0 failed",
  ],
] as const;

const syncErrors = [
  [
    "16:42:18",
    "FIX",
    "USA",
    "Timeout retrieving delayed quote",
    "Last known 708.25 USD retained",
  ],
  [
    "16:42:21",
    "ABE",
    "GPW",
    "Instrument mapping unavailable",
    "Price marked unavailable",
  ],
  [
    "16:42:26",
    "DVL",
    "GPW",
    "Provider returned empty price",
    "Manual value retained",
  ],
  [
    "16:42:31",
    "PEP",
    "USA",
    "Rate limit retry exhausted",
    "Last known 146.88 USD retained",
  ],
] as const;

const statusColumns = "grid-cols-[180px_120px_120px_minmax(0,1fr)_90px]";
const errorColumns = "grid-cols-[82px_58px_60px_minmax(0,1fr)_230px]";

export default function DataSettingsPage() {
  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="Market-data provider health and synchronization history"
        title="Settings"
      >
        <ActionButton className="w-[122px]" variant="primary">
          Synchronize now
        </ActionButton>
      </PageHeader>

      <SettingsTabs active="data" />

      <div className="flex flex-col gap-4">
        <Surface className="h-[116px]">
          <div className="grid h-full grid-cols-[340px_repeat(4,211px)]">
            <div className="flex h-[82px] flex-col gap-[2px] border-r border-[var(--border-subtle)] px-[14px] pt-[14px]">
              <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                MARKET DATA PROVIDER
              </span>
              <strong className="text-[13px] leading-[18px]">
                EOD Historical Data
              </strong>
              <span className="mt-[2px] font-mono text-[9px] text-[var(--text-muted)]">
                API key saved · ••••••••••••Q7D2
              </span>
            </div>
            {[
              ["CONFIGURATION", "CONNECTED", "positive"],
              ["LAST SUCCESS", "01 Sep · 16:42 CET", "default"],
              ["LAST FAILURE", "31 Aug · 18:02 CET", "warning"],
              ["COVERAGE", "78 instruments", "default"],
            ].map(([label, value, tone]) => (
              <div
                className="flex h-[61px] flex-col gap-[5px] border-r border-[var(--border-subtle)] px-[14px] pt-[14px] last:border-r-0"
                key={label}
              >
                <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                  {label}
                </span>
                <span
                  className={`font-mono text-[11px] font-semibold ${tone === "positive" ? "text-[var(--positive)]" : tone === "warning" ? "text-[var(--warning)]" : "text-[var(--text-primary)]"}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="h-48">
          <SectionHeader
            meta="74 of 78 updated · 4 failed"
            title="Synchronization status"
          />
          {marketStatus.map(([market, count, state, updated, failed]) => (
            <div
              className={`grid h-[52px] items-center border-t border-[var(--border-subtle)] px-3 text-[10px] ${statusColumns}`}
              key={market}
            >
              <strong>{market}</strong>
              <span className="font-mono text-[var(--text-secondary)]">
                {count}
              </span>
              <span
                className={
                  state === "SUCCESS"
                    ? "text-[var(--positive)]"
                    : "text-[var(--warning)]"
                }
              >
                {state}
              </span>
              <span className="font-mono text-[var(--text-secondary)]">
                {updated}
              </span>
              <span
                className={
                  failed === "0 failed"
                    ? "text-[var(--text-muted)]"
                    : "text-[var(--negative)]"
                }
              >
                {failed}
              </span>
            </div>
          ))}
        </Surface>

        <Surface className="h-[228px]">
          <SectionHeader
            meta="Provider secrets are never displayed"
            title="Recent synchronization errors"
          />
          {syncErrors.map(([time, ticker, market, message, fallback]) => (
            <div
              className={`grid h-12 items-center border-t border-[var(--border-subtle)] px-3 text-[10px] ${errorColumns}`}
              key={`${time}-${ticker}`}
            >
              <span className="font-mono text-[var(--text-muted)]">{time}</span>
              <strong className="font-mono">{ticker}</strong>
              <span className="text-[var(--text-muted)]">{market}</span>
              <span className="truncate pr-4 text-[var(--negative)]">
                {message}
              </span>
              <span className="text-right text-[var(--text-secondary)]">
                {fallback}
              </span>
            </div>
          ))}
        </Surface>

        <div className="flex h-14 items-center gap-3 rounded-[7px] border border-[var(--warning)] bg-[var(--warning-subtle)] px-4">
          <AlertTriangle
            aria-hidden="true"
            className="size-4 shrink-0 text-[var(--warning)]"
          />
          <span className="flex flex-col gap-[2px]">
            <strong className="text-[10px] text-[var(--warning)]">
              Historical research remains usable during provider failures
            </strong>
            <span className="text-[9px] text-[var(--text-secondary)]">
              Prices retain their last-known timestamps; manual and unavailable
              values remain explicitly labeled.
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
