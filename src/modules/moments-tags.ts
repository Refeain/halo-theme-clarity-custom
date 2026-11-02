/**
 * 瞬间标签模块
 * 处理瞬间页面标签的水平滚动、触摸滑动和自动定位
 */

const observers: MutationObserver[] = [];
let momentsTagsResizeHandler: (() => void) | null = null;

const cleanupObservers = () => {
  observers.forEach((observer) => observer.disconnect());
  observers.length = 0;
};

export const initMomentsTags = () => {
  cleanupObservers();

  if (momentsTagsResizeHandler) {
    window.removeEventListener("resize", momentsTagsResizeHandler);
    momentsTagsResizeHandler = null;
  }

  const scrollContainers = document.querySelectorAll<HTMLElement>(".scrollcheck-x");

  scrollContainers.forEach((container) => {
    const wrapper = container.closest<HTMLElement>(".moments-tags-wrapper");
    const hoverHint = wrapper?.querySelector<HTMLElement>(".at-slide-hover");

    const checkScrollable = () => {
      const isScrollable = container.scrollWidth > container.clientWidth;
      if (hoverHint) {
        hoverHint.style.display = isScrollable ? "inline-flex" : "none";
      }
    };

    const scrollToActiveTag = () => {
      const activeTag = container.querySelector<HTMLElement>(".tag-item.active");
      if (!activeTag) return;

      const containerRect = container.getBoundingClientRect();
      const tagRect = activeTag.getBoundingClientRect();

      if (tagRect.right > containerRect.right) {
        const scrollAmount = tagRect.right - containerRect.right;
        container.scrollLeft += scrollAmount + 20;
      } else if (tagRect.left < containerRect.left) {
        const scrollAmount = containerRect.left - tagRect.left;
        container.scrollLeft -= scrollAmount + 20;
      }
    };

    // 鼠标滚轮水平滚动
    container.addEventListener(
      "wheel",
      (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      },
      { passive: false },
    );

    // 触摸滑动支持
    let touchStartX = 0;
    let touchStartY = 0;

    container.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true },
    );

    container.addEventListener(
      "touchmove",
      (e) => {
        const touchCurrentX = e.touches[0].clientX;
        const touchCurrentY = e.touches[0].clientY;
        const diffX = touchStartX - touchCurrentX;
        const diffY = touchStartY - touchCurrentY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
          e.preventDefault();
          container.scrollLeft += diffX;
          touchStartX = touchCurrentX;
          touchStartY = touchCurrentY;
        }
      },
      { passive: false },
    );

    checkScrollable();
    scrollToActiveTag();

    momentsTagsResizeHandler = checkScrollable;
    window.addEventListener("resize", checkScrollable);

    // 监听活动标签变化，自动滚动到可视区域
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          const target = mutation.target as HTMLElement;
          if (target.classList.contains("tag-item") && target.classList.contains("active")) {
            setTimeout(() => scrollToActiveTag(), 100);
          }
        }
      });
    });

    container.querySelectorAll<HTMLElement>(".tag-item").forEach((tag) => {
      observer.observe(tag, { attributes: true, attributeFilter: ["class"] });
    });

    observers.push(observer);
  });
};
