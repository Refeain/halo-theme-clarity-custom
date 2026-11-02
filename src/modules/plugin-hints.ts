/**
 * 插件缺失提示条（.plugin-hint，仅管理员可见）
 *
 * 关闭状态记忆在 localStorage。点击关闭按钮使用 document 级事件委托，
 * Swup 页面替换后无需重复绑定；导航完成后重新执行 hideDismissed 即可。
 */
const STORAGE_KEY = "clarity-plugin-hints-dismissed";

const readDismissed = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const hideDismissed = () => {
  const dismissed = readDismissed();
  if (!dismissed.length) return;
  document.querySelectorAll<HTMLElement>(".plugin-hint[data-hint-id]").forEach((bar) => {
    const id = bar.dataset.hintId;
    if (id && dismissed.includes(id)) bar.remove();
  });
};

let bound = false;

export const initPluginHints = () => {
  if (!bound) {
    bound = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const btn = target?.closest<HTMLElement>("[data-plugin-hint-dismiss]");
      if (!btn) return;

      const bar = btn.closest<HTMLElement>(".plugin-hint");
      const id = bar?.dataset.hintId;
      bar?.remove();

      if (!id) return;
      const dismissed = readDismissed();
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
        } catch {
          // 隐私模式等存储不可用的场景下仅关闭当次提示
        }
      }
    });
  }
  hideDismissed();
};
