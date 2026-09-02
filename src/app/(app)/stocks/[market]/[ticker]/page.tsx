import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  ActionButton,
  SectionHeader,
  StatusBadge,
  Surface,
} from "@/components/ui/terminal";

type StockPageProps = { params: Promise<{ market: string; ticker: string }> };

export async function generateMetadata({
  params,
}: StockPageProps): Promise<Metadata> {
  const { ticker } = await params;
  return { title: ticker.toUpperCase() };
}

const scores = [
  ["INVESTMENT", "78", "bg-[var(--accent-primary)]"],
  ["QUALITY", "84", "bg-[var(--positive)]"],
  ["VALUATION", "72", "bg-[var(--info)]"],
  ["MOMENTUM", "61", "bg-[var(--warning)]"],
  ["RISK", "34", "bg-[var(--positive)]"],
  ["SAFETY", "76", "bg-[var(--positive)]"],
] as const;

const levels = [
  [
    "CURRENT PRICE",
    "475.00 USD",
    "—",
    "REFERENCE",
    "text-[var(--accent-primary)]",
  ],
  [
    "FAIR VALUE",
    "520.00 USD",
    "9.5% below FV",
    "BELOW LEVEL",
    "text-[var(--info)]",
  ],
  [
    "STRONG BUY",
    "430.00 USD",
    "10.5% above",
    "NOT REACHED",
    "text-[var(--positive)]",
  ],
  [
    "TRANCHE 1",
    "460.00 USD",
    "3.2% above",
    "NOT REACHED",
    "text-[var(--warning)]",
  ],
  [
    "TRANCHE 2",
    "420.00 USD",
    "13.1% above",
    "NOT REACHED",
    "text-[var(--text-secondary)]",
  ],
  [
    "TRANCHE 3",
    "380.00 USD",
    "25.0% above",
    "NOT REACHED",
    "text-[var(--text-secondary)]",
  ],
] as const;

const history = [
  [
    "28 AUG 2026",
    "WAIT → DEEP DIVE",
    "475.00 USD · SCORE 78",
    "Backlog quality merits refreshed downside case.",
  ],
  [
    "12 JUL 2026",
    "WATCH → WAIT",
    "438.20 USD · SCORE 74",
    "Valuation moved beyond initial entry range.",
  ],
  [
    "03 MAY 2026",
    "WATCH",
    "387.60 USD · SCORE 79",
    "Margins and cash conversion remained supportive.",
  ],
] as const;

export default async function StockPage({ params }: StockPageProps) {
  await params;
  return (
    <div className="flex min-h-[1148px] flex-col gap-4 p-6">
      <header className="flex h-[110px] flex-col gap-[10px] border-b border-[var(--border-default)] py-3">
        <div className="flex h-11 items-center justify-between">
          <div className="flex h-11 flex-col gap-[3px]">
            <div className="flex items-center gap-2">
              <h1 className="text-[21px] leading-[27px] font-semibold">
                EMCOR Group
              </h1>
              <StatusBadge tone="info">USA</StatusBadge>
            </div>
            <p className="text-[11px] leading-[14px] text-[var(--text-muted)]">
              EME · NYSE · USD · Industrials / Engineering &amp; Construction
            </p>
          </div>
          <div className="flex items-center gap-3">
            <strong className="font-mono text-xl leading-[26px] font-semibold">
              475.00 USD
            </strong>
            <span className="flex items-center gap-1 font-mono text-xs font-semibold text-[var(--positive)]">
              <ArrowUpRight className="size-3" />
              +2.4%
            </span>
            <StatusBadge tone="warning">DELAYED · 15m</StatusBadge>
          </div>
        </div>
        <div className="flex h-8 items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
            <span className="font-mono">As of 16:42 CET</span>
            <span>Provider: EODHD</span>
            <StatusBadge>DEEP DIVE</StatusBadge>
          </div>
          <div className="flex items-center gap-2">
            <ActionButton variant="ghost">Edit levels</ActionButton>
            <ActionButton>Add note</ActionButton>
            <Link
              className="flex h-8 items-center rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]"
              href="/monitoring/new"
            >
              New monitoring
            </Link>
          </div>
        </div>
      </header>

      <div className="flex h-[104px] gap-4">
        <Surface className="flex h-[61px] flex-1 items-center gap-3 p-3">
          {scores.map(([label, value, tone]) => (
            <div className="flex min-w-0 flex-1 flex-col gap-1" key={label}>
              <span className="text-[9px] leading-3 font-semibold tracking-[0.6px] text-[var(--text-muted)]">
                {label}
              </span>
              <span className="flex items-center gap-1.5">
                <strong className="font-mono text-base leading-[21px] font-semibold">
                  {value}
                </strong>
                <span className={`h-[3px] w-11 rounded-[1px] ${tone}`} />
              </span>
            </div>
          ))}
        </Surface>
        <Surface className="flex h-[90px] w-[300px] flex-col gap-1.5 p-3">
          <span className="text-[9px] leading-3 font-semibold text-[var(--text-muted)]">
            LAST ANALYSIS · 28 AUG 2026
          </span>
          <strong className="text-xs leading-4 text-[var(--accent-primary)]">
            ACCUMULATE ON WEAKNESS
          </strong>
          <p className="text-[10px] leading-[13px] text-[var(--text-secondary)]">
            Backlog quality and execution remain strong; valuation requires
            disciplined entry levels.
          </p>
        </Surface>
      </div>

      <div className="grid h-[328px] grid-cols-[490px_1fr] gap-4">
        <Surface>
          <SectionHeader
            meta={<span className="font-mono">Current 475.00 USD</span>}
            title="Price levels"
          />
          {levels.map(([label, price, distance, state, tone]) => (
            <div
              className="grid h-[47px] grid-cols-[112px_100px_158px_1fr] items-center border-b border-[var(--border-subtle)] px-3 text-[10px]"
              key={label}
            >
              <strong className="font-semibold text-[var(--text-secondary)]">
                {label}
              </strong>
              <strong className="font-mono text-[11px]">{price}</strong>
              <span className={`font-mono ${tone}`}>{distance}</span>
              <strong className={`text-right text-[9px] ${tone}`}>
                {state}
              </strong>
            </div>
          ))}
        </Surface>
        <Surface className="flex flex-col gap-3 p-[14px]">
          <h2 className="text-[13px] leading-[17px] font-semibold">
            Investment thesis
          </h2>
          <p className="text-[11px] leading-[15px] text-[var(--text-secondary)]">
            A high-quality specialty contractor benefiting from data-center,
            healthcare and reshoring capex, with durable execution advantages
            and a disciplined balance sheet.
          </p>
          <div className="grid h-[53px] grid-cols-3 gap-4">
            {[
              [
                "BULL CASE",
                "Backlog converts above plan; margins hold despite normalization.",
                "text-[var(--positive)]",
              ],
              [
                "BASE CASE",
                "Mid-teens EPS growth supports valuation near fair value.",
                "text-[var(--info)]",
              ],
              [
                "BEAR CASE",
                "Project mix and labor constraints compress margins.",
                "text-[var(--negative)]",
              ],
            ].map(([label, body, tone]) => (
              <div
                className="border-l border-[var(--border-subtle)] pl-3"
                key={label}
              >
                <strong className={`text-[9px] leading-3 ${tone}`}>
                  {label}
                </strong>
                <p className="mt-1 text-[10px] leading-[13px] text-[var(--text-secondary)]">
                  {body}
                </p>
              </div>
            ))}
          </div>
          <strong className="text-[9px] leading-3 text-[var(--text-muted)]">
            CATALYSTS
          </strong>
          <p className="text-[10px] leading-[13px] text-[var(--text-secondary)]">
            • Record backlog conversion&nbsp;&nbsp; • Data-center
            awards&nbsp;&nbsp; • Accretive bolt-on M&amp;A&nbsp;&nbsp; • Margin
            resilience
          </p>
        </Surface>
      </div>

      <div className="grid h-[348px] grid-cols-[808px_1fr] gap-4">
        <Surface>
          <SectionHeader
            meta={
              <button className="text-[var(--accent-primary)]" type="button">
                Expand all
              </button>
            }
            title="Monitoring history"
          />
          {history.map(([date, transition, price, summary]) => (
            <article
              className="grid h-[86px] grid-cols-[82px_1fr] gap-3 border-b border-[var(--border-subtle)] p-3"
              key={date}
            >
              <time className="font-mono text-[9px] leading-3 font-semibold text-[var(--text-muted)]">
                {date}
              </time>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <strong className="text-[11px] text-[var(--accent-primary)]">
                    {transition}
                  </strong>
                  <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                    {price}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  {summary}
                </p>
                <span className="text-[9px] text-[var(--text-muted)]">
                  Source: manual research · recommendation recorded
                </span>
              </div>
            </article>
          ))}
        </Surface>
        <div className="flex flex-col gap-3">
          <Surface className="flex h-[91px] flex-col gap-1.5 p-3">
            <h2 className="text-xs font-semibold">Key risks</h2>
            <p className="whitespace-pre-line text-[10px] leading-[15px] text-[var(--text-secondary)]">
              • Labor availability and wage pressure{"\n"}• Large-project
              execution concentration{"\n"}• Capex cycle normalization
            </p>
          </Surface>
          <section className="flex h-[68px] flex-col gap-1.5 rounded-[5px] border-l-[3px] border-[var(--negative)] bg-[var(--negative-subtle)] p-3">
            <strong className="text-[9px] text-[var(--negative)]">
              KILL THE THESIS
            </strong>
            <p className="text-[10px] leading-[13px] text-[var(--text-secondary)]">
              Backlog declines for two quarters while segment margin falls below
              6.5%, or net debt exceeds 2× EBITDA after acquisitions.
            </p>
          </section>
          <Surface className="flex h-[165px] flex-col gap-[7px] p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold">Notes</h2>
              <button
                className="text-[10px] font-semibold text-[var(--accent-primary)]"
                type="button"
              >
                + Quick add
              </button>
            </div>
            <p className="text-[10px] font-semibold text-[var(--warning)]">
              PINNED · Verify data-center backlog mix in next 10-Q.
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]">
              31 Aug · Revisit fair value if FY margin guide is raised.
            </p>
          </Surface>
        </div>
      </div>
    </div>
  );
}
