import type { HookArguments } from "swup";
import type { Visit } from "swup";
import { showToast } from "../../utils/toast";
import { executeNewScripts } from "./scripts";
import { updateActiveNavItem } from "./navigation";

const MAX_RETRIES = 3;
const RETRY_COUNT_KEY = "swup_retry_count";
const SWUP_DISABLED_KEY = "swup_disabled";

export const handleSwupSend = (visit: Visit) => {
  document.body.classList.add("swup-loading");
  window.dispatchEvent(new CustomEvent("swup:start", { detail: { visit } }));

  const sidebar = document.getElementById("z-sidebar");
  const sidebarBgmask = document.getElementById("z-sidebar-bgmask");
  const toggleSidebar = document.getElementById("toggle-sidebar");

  sidebar?.classList.remove("show");
  sidebarBgmask?.classList.add("hidden");
  toggleSidebar?.classList.remove("active");

  const aside = document.getElementById("z-aside");
  const asideBgmask = document.getElementById("z-aside-bgmask");
  const toggleAside = document.getElementById("toggle-aside");

  aside?.classList.remove("show");
  asideBgmask?.classList.add("hidden");
  toggleAside?.classList.remove("active");
};

export const handleSwupComplete = (visit: Visit) => {
  document.body.classList.remove("swup-loading");
  window.dispatchEvent(new CustomEvent("swup:complete", { detail: { visit } }));
};

export const createSwupSuccessHandler = (reinitializeComponents: () => void, syncThemeConfig: () => void) => {
  return (visit: Visit, args: HookArguments<"page:view">) => {
    window.dispatchEvent(new CustomEvent("swup:success", { detail: { visit, ...args } }));
    syncThemeConfig();
    executeNewScripts();
    reinitializeComponents();
    updateActiveNavItem();
    sessionStorage.removeItem(RETRY_COUNT_KEY);
  };
};

export const handleSwupTimeout = (args: HookArguments<"fetch:timeout">) => {
  handleSwupFailure("Swup request timed out", args);
};

export const handleSwupError = (visit: Visit, args: HookArguments<"fetch:error">) => {
  handleSwupFailure("Swup request failed", { visit, ...args });
};

const handleSwupFailure = (message: string, detail: unknown) => {
  console.error(message, detail);
  document.body.classList.remove("swup-loading");
  window.dispatchEvent(new CustomEvent("swup:error", { detail }));

  if (localStorage.getItem(SWUP_DISABLED_KEY) === "true") {
    showToast("页面加载失败，请检查网络连接后手动刷新。", "danger");
    return;
  }

  const retryCount = parseInt(sessionStorage.getItem(RETRY_COUNT_KEY) || "0", 10);

  if (retryCount < MAX_RETRIES) {
    sessionStorage.setItem(RETRY_COUNT_KEY, String(retryCount + 1));
    window.location.reload();
    return;
  }

  sessionStorage.removeItem(RETRY_COUNT_KEY);
  window.themeConfig = window.themeConfig || {};
  window.themeConfig.custom = window.themeConfig.custom || {};
  window.themeConfig.custom.enable_swup = false;
  localStorage.setItem(SWUP_DISABLED_KEY, "true");
  showToast("页面加载失败，已自动禁用 Swup，请刷新页面重试。", "danger");
};
