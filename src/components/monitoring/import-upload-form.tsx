"use client";

import { Check, FileCheck2, FileJson, ShieldCheck, Upload } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import {
  createImportDraftAction,
  type ImportUploadState,
} from "@/app/(app)/monitoring/import/actions";
import {
  ActionButton,
  SectionHeader,
  Surface,
} from "@/components/ui/terminal";
import { useT } from "@/i18n/provider";

const initialImportUploadState: ImportUploadState = {
  status: "idle",
  message: "",
};

export function ImportUploadForm() {
  const t = useT();
  const [state, action, pending] = useActionState(
    createImportDraftAction,
    initialImportUploadState,
  );
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const safetyRules = [
    t("monitoring.import.safetyRuleSchema"),
    t("monitoring.import.safetyRuleCompanyState"),
    t("monitoring.import.safetyRuleSelectiveCommit"),
    t("monitoring.import.safetyRuleImmutable"),
    t("monitoring.import.safetyRuleDuplicates"),
  ];

  return (
    <form
      action={action}
      className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <Surface className="grid min-h-[16rem] place-items-center px-4 py-8 sm:min-h-[19rem]">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <span className="grid size-14 place-items-center rounded-[var(--radius-md)] border border-primary/25 bg-[var(--accent-subtle)]">
              <FileJson aria-hidden="true" className="size-6 text-primary" />
            </span>
            <div className="space-y-1.5">
              <h2 className="text-card-title">
                {t("monitoring.import.selectExportTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("monitoring.import.selectExportHint")}
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
            <ActionButton
              className="min-h-11"
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden="true" className="mr-2 size-4" />{" "}
              {t("monitoring.import.selectJsonFile")}
            </ActionButton>
            <p className="ui-meta">
              {t("monitoring.import.validatedOnServer")}
            </p>
          </div>
        </Surface>

        {file ? (
          <Surface className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <FileCheck2
                aria-hidden="true"
                className="size-5 shrink-0 text-positive"
              />
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold">
                  {file.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("monitoring.import.readyToValidate", {
                    size: Math.ceil(file.size / 1024),
                  })}
                </p>
              </div>
            </div>
            <ActionButton
              className="min-h-11 w-full shrink-0 sm:w-auto"
              disabled={pending}
              type="submit"
              variant="primary"
            >
              {pending
                ? t("monitoring.import.validating")
                : t("monitoring.import.validateDraft")}
            </ActionButton>
          </Surface>
        ) : null}

        {state.status === "error" ? (
          <div
            aria-live="polite"
            className="rounded-[var(--radius-md)] border border-negative bg-[var(--negative-subtle)] p-3 text-sm"
            role="alert"
          >
            <strong>{state.message}</strong>
            {state.issues?.length ? (
              <ul className="mt-2 space-y-1 text-sm text-secondary-foreground">
                {state.issues.map((issue) => (
                  <li key={`${issue.path}-${issue.message}`}>
                    <span className="font-mono text-negative">{issue.path}</span>{" "}
                    — {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <Surface className="flex flex-col">
        <SectionHeader
          action={
            <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
          }
          title={t("monitoring.import.safetyTitle")}
        />
        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm leading-relaxed text-secondary-foreground">
            {t("monitoring.import.safetyDescription")}
          </p>
          <ul className="space-y-2.5">
            {safetyRules.map((rule) => (
              <li
                className="flex items-start gap-2 text-sm text-secondary-foreground"
                key={rule}
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-positive"
                />
                {rule}
              </li>
            ))}
          </ul>
          <div className="rounded-[var(--radius-md)] border border-border bg-muted p-3">
            <p className="ui-meta font-semibold tracking-wide uppercase">
              {t("monitoring.import.expectedContract")}
            </p>
            <p className="mt-1 font-mono text-sm">schemaVersion 1.0</p>
            <p className="font-mono text-sm text-primary">
              gpw_opportunity_monitoring
            </p>
          </div>
        </div>
      </Surface>
    </form>
  );
}
