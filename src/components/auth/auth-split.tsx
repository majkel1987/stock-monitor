import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const LOGIN_ILLUSTRATION_SRC = "/images/login_modal_pic.png";

export function AuthSplit({
  title,
  titleId,
  children,
  note,
  noteTone = "muted",
}: {
  title: string;
  titleId: string;
  children: ReactNode;
  note?: string | null;
  noteTone?: "muted" | "danger";
}) {
  return (
    <main className="dark flex min-h-dvh flex-col bg-background lg:flex-row">
      <div className="relative h-36 w-full shrink-0 bg-sidebar sm:h-48 lg:h-auto lg:min-h-dvh lg:w-[42%] max-[359px]:hidden">
        <Image
          alt=""
          className="object-cover object-center"
          fill
          priority
          sizes="(max-width: 1023px) 100vw, 42vw"
          src={LOGIN_ILLUSTRATION_SRC}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-8 sm:px-10 lg:px-16 lg:py-12">
        <div className="mx-auto flex w-full max-w-[22.5rem] flex-col">
          <div className="mb-8">
            <div className="mb-5 grid size-10 place-items-center rounded-[var(--radius-md)] bg-primary text-primary-foreground">
              <span className="font-mono text-xs font-bold">SM</span>
            </div>
            <p className="ui-eyebrow mb-2">Stock Monitor</p>
            <h1
              className="text-[clamp(1.5rem,1.3rem+0.8vw,1.875rem)] font-semibold leading-tight tracking-tight text-foreground"
              id={titleId}
            >
              {title}
            </h1>
            <p className="mt-2 font-mono text-sm tracking-wide text-muted-foreground uppercase">
              GPW + USA
            </p>
          </div>

          {children}

          {note ? (
            <p
              aria-live="polite"
              className={cn(
                "mt-6 text-sm leading-normal",
                noteTone === "danger"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {note}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
