/**
 * 返回顶部模块
 * 处理移动端和桌面端返回顶部按钮的显示/隐藏及交互
 */

let backToTopScrollHandler: (() => void) | null = null;
let backToTopMobileHandlers: Map<
  HTMLButtonElement,
  { onPointerDown: () => void; clearTimer: () => void; onClick: () => void }
> | null = null;

/**
 * 初始化回到顶部按钮
 * 支持移动端长按返回上一页，短按返回顶部
 */
export const initBackToTop = () => {
  const mobileBtn = document.getElementById("back-to-top") as HTMLButtonElement | null;
  const pcBtn = document.getElementById("pc-back-to-top") as HTMLButtonElement | null;

  if (!mobileBtn && !pcBtn) return;

  // 清理已有的事件监听器
  if (backToTopScrollHandler) {
    window.removeEventListener("scroll", backToTopScrollHandler);
  }

  if (backToTopMobileHandlers) {
    backToTopMobileHandlers.forEach((handlers, btn) => {
      btn.removeEventListener("mousedown", handlers.onPointerDown);
      btn.removeEventListener("touchstart", handlers.onPointerDown);
      btn.removeEventListener("mouseup", handlers.clearTimer);
      btn.removeEventListener("mouseleave", handlers.clearTimer);
      btn.removeEventListener("touchend", handlers.clearTimer);
      btn.removeEventListener("click", handlers.onClick);
    });
    backToTopMobileHandlers.clear();
  } else {
    backToTopMobileHandlers = new Map();
  }

  const updateVisibility = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const showMobile = y > 300;

    if (mobileBtn) mobileBtn.style.display = showMobile ? "" : "none";

    if (pcBtn) {
      if (showMobile) {
        pcBtn.classList.add("show");
      } else {
        pcBtn.classList.remove("show");
      }
    }
  };

  backToTopScrollHandler = updateVisibility;
  updateVisibility();
  window.addEventListener("scroll", updateVisibility, { passive: true });

  // 移动端按钮支持长按返回上一页
  if (mobileBtn) {
    let pressTimer: number | null = null;
    let longPressed = false;
    const pressDuration = 600;

    const onPointerDown = () => {
      longPressed = false;
      pressTimer = window.setTimeout(() => {
        longPressed = true;
        if (history.length > 1) {
          history.back();
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, pressDuration);
    };

    const clearTimer = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const onClick = () => {
      if (!longPressed) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    mobileBtn.addEventListener("mousedown", onPointerDown);
    mobileBtn.addEventListener("touchstart", onPointerDown);
    mobileBtn.addEventListener("mouseup", clearTimer);
    mobileBtn.addEventListener("mouseleave", clearTimer);
    mobileBtn.addEventListener("touchend", clearTimer);
    mobileBtn.addEventListener("click", onClick);

    backToTopMobileHandlers.set(mobileBtn, { onPointerDown, clearTimer, onClick });
  }
};
