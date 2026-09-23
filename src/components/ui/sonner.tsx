"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useSyncExternalStore, type CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import {
  getTheme,
  subscribeTheme,
  type AppTheme,
} from "@/components/theme/theme-store";

const MOBILE_QUERY = "(max-width: 639px)";

const subscribeMobile = (onStoreChange: () => void) => {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
};

const getIsMobile = () => window.matchMedia(MOBILE_QUERY).matches;

export function Toaster({ ...props }: ToasterProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getTheme,
    (): AppTheme => "dark",
  );
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, () => false);

  return (
    <Sonner
      className="toaster group"
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      mobileOffset={{ bottom: 16, right: 12, left: 12 }}
      offset={{ bottom: 20, right: 20 }}
      position={isMobile ? "bottom-center" : "bottom-right"}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "var(--popover)",
          "--success-border": "var(--border)",
          "--success-text": "var(--popover-foreground)",
          "--error-bg": "var(--popover)",
          "--error-border": "var(--border)",
          "--error-text": "var(--popover-foreground)",
          "--warning-bg": "var(--popover)",
          "--warning-border": "var(--border)",
          "--warning-text": "var(--popover-foreground)",
          "--info-bg": "var(--popover)",
          "--info-border": "var(--border)",
          "--info-text": "var(--popover-foreground)",
        } as CSSProperties
      }
      theme={theme}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-[var(--shadow-lg)] group-[.toaster]:rounded-[var(--radius-md)]",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:leading-snug",
          description:
            "group-[.toast]:text-[0.8125rem] group-[.toast]:leading-normal group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:border-border group-[.toast]:bg-popover group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:[&>div>svg]:text-positive",
          error: "group-[.toaster]:[&>div>svg]:text-destructive",
          warning: "group-[.toaster]:[&>div>svg]:text-warning",
          info: "group-[.toaster]:[&>div>svg]:text-info",
          loading: "group-[.toaster]:[&>div>svg]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
