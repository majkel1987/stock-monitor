export const THEME_STORAGE_KEY = "stock-monitor-theme";
export const THEME_EVENT = "stock-monitor-theme";

export type AppTheme = "light" | "dark";

export const applyTheme = (theme: AppTheme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
};

export const getTheme = (): AppTheme =>
  window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";

export const subscribeTheme = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_EVENT, onStoreChange);
  };
};
