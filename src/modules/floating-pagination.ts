/**
 * 浮动分页模块
 * 处理分页组件的展开/收起动画效果
 */

let floatingPaginationCleanup: (() => void) | null = null;

/**
 * 初始化浮动分页组件
 * 根据分页锚点的可见性控制分页栏的展开/收起状态
 */
export const initFloatingPagination = () => {
  if (floatingPaginationCleanup) {
    floatingPaginationCleanup();
    floatingPaginationCleanup = null;
  }

  const paginations = Array.from(document.querySelectorAll<HTMLElement>(".pagination-wrapper.sticky-pagination"));
  if (!paginations.length) return;

  const cleanups: Array<() => void> = [];

  paginations.forEach((pagination) => {
    const anchor = pagination.nextElementSibling as HTMLElement | null;
    if (!anchor || !anchor.classList.contains("pagination-anchor")) return;

    const updateExpanded = (expanded: boolean) => {
      pagination.classList.toggle("expand", expanded);
    };

    const updateCollapsedWidth = () => {
      const pageCount = parseInt(pagination.getAttribute("data-page-count") || "10", 10);
      const hasJump = pagination.querySelector(".pagination-jump") !== null;
      // 页码按钮宽度 3em，加上首页/尾页/省略号等额外空间
      const baseWidth = pageCount * 3 + 10;
      const jumpWidth = hasJump ? 10 : 0;
      const collapsedWidth = baseWidth + jumpWidth;
      pagination.style.setProperty("--collapsed-width", `${collapsedWidth}em`);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const isAnchorVisible = entries.some((entry) => entry.isIntersecting);
        updateExpanded(isAnchorVisible);
      },
      { threshold: 0.05 },
    );

    observer.observe(anchor);
    updateCollapsedWidth();
    updateExpanded(false);
    window.addEventListener("resize", updateCollapsedWidth);

    cleanups.push(() => {
      observer.disconnect();
      window.removeEventListener("resize", updateCollapsedWidth);
      pagination.classList.remove("expand");
      pagination.style.removeProperty("--collapsed-width");
    });
  });

  floatingPaginationCleanup = () => {
    cleanups.forEach((cleanup) => cleanup());
  };
};
