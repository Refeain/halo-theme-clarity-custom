/**
 * Alpine.js 组件重新初始化
 * 遍历所有带有x-data属性的元素，对未初始化的元素进行Alpine.js初始化
 */
export const reinitializeAlpineComponents = () => {
  if (window.Alpine) {
    document.querySelectorAll("[x-data]").forEach((el) => {
      const alpineEl = el as HTMLElement & { _x_dataStack?: unknown[] };
      if (!alpineEl._x_dataStack) {
        window.Alpine.initTree(alpineEl as Parameters<typeof window.Alpine.initTree>[0]);
      }
    });
  }
};
