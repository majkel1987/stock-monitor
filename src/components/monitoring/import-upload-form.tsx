"use client";

import { Check, FileCheck2, FileJson, ShieldCheck, Upload } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import {
  createImportDraftAction,
  type ImportUploadState,
} from "@/app/(app)/monitoring/import/actions";
import { ActionButton, Surface } from "@/components/ui/terminal";

const safetyRules = [
  "Schema and semantic validation",
  "Per-company READY / WARNING / ERROR state",
  "Selective commit after review",
  "Immutable monitoring snapshot",
  "Duplicate protection by externalId",
];

const initialImportUploadState: ImportUploadState = {
  status: "idle",
  message: "",
};

export function ImportUploadForm() {
  const [state, action, pending] = useActionState(
    createImportDraftAction,
    initialImportUploadState,
  );
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="grid flex-1 grid-cols-[1fr_330px] gap-4">
      <div className="flex min-w-0 flex-col gap-3">
        <Surface className="grid h-[304px] place-items-center">
          <div className="flex flex-col items-center gap-[14px] text-center">
            <span className="grid size-[52px] place-items-center rounded-[7px] bg-[var(--accent-subtle)]">
              <FileJson className="size-6 text-[var(--accent-primary)]" />
            </span>
            <div className="space-y-1">
              <h2 className="text-[15px] font-semibold">
                Select a GPW monitoring export
              </h2>
              <p className="text-[10px] text-[var(--text-muted)]">
                JSON only · schema 1.0 · up to 1 MB · maximum 50 companies
              </p>
            </div>
            <input
              accept="application/json,.json"
              className="sr-only"
              name="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              ref={inputRef}
              required
              type="file"
            />
            <ActionButton onClick={() => inputRef.current?.click()}>
              <Upload className="mr-2 size-3.5" /> Select JSON file
            </ActionButton>
            <p className="text-[10px] text-[var(--text-secondary)]">
              The file is validated on the server before a draft is saved.
            </p>
          </div>
        </Surface>

        {file ? (
          <Surface className="flex min-h-[66px] items-center justify-between px-[14px]">
            <div className="flex items-center gap-[10px]">
              <FileCheck2 className="size-[18px] text-[var(--positive)]" />
              <div>
                <p className="font-mono text-[11px] font-semibold">
                  {file.name}
                </p>
                <p className="text-[9px] text-[var(--text-muted)]">
                  {Math.ceil(file.size / 1024)} KB · ready to validate
                </p>
              </div>
            </div>
            <ActionButton disabled={pending} type="submit" variant="primary">
              {pending ? "Validating…" : "Validate & create draft"}
            </ActionButton>
          </Surface>
        ) : null}

        {state.status === "error" ? (
          <div
            aria-live="polite"
            className="rounded-[7px] border border-[var(--negative)] bg-[var(--negative-subtle)] p-3 text-[11px]"
          >
            <strong>{state.message}</strong>
            {state.issues?.length ? (
              <ul className="mt-2 space-y-1 text-[10px] text-[var(--text-secondary)]">
                {state.issues.map((issue) => (
                  <li key={`${issue.path}-${issue.message}`}>
                    <span className="font-mono text-[var(--negative)]">
                      {issue.path}
                    </span>{" "}
                    — {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <Surface className="flex flex-col">
        <header className="flex h-[38px] items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3">
          <ShieldCheck className="size-3.5 text-[var(--accent-primary)]" />
          <h2 className="text-[10px] font-bold tracking-[0.5px]">
            IMPORT SAFETY
          </h2>
        </header>
        <div className="flex flex-col gap-[14px] p-[14px]">
          <p className="text-[10px] leading-[1.4] text-[var(--text-secondary)]">
            AI-generated data is treated as untrusted input. Validation errors
            stay isolated to individual companies.
          </p>
          <ul className="space-y-[9px]">
            {safetyRules.map((rule) => (
              <li
                className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]"
                key={rule}
              >
                <Check className="size-3 text-[var(--positive)]" /> {rule}
              </li>
            ))}
          </ul>
          <div className="rounded-[5px] border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-[10px]">
            <p className="text-[8px] font-bold tracking-[0.5px] text-[var(--text-muted)]">
              EXPECTED CONTRACT
            </p>
            <p className="mt-1 font-mono text-[10px]">schemaVersion 1.0</p>
            <p className="font-mono text-[9px] text-[var(--accent-primary)]">
              gpw_opportunity_monitoring
            </p>
          </div>
        </div>
      </Surface>
    </form>
  );
}
