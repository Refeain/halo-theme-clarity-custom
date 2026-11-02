/**
 * 初始化下拉菜单
 * 使用事件委托处理下拉菜单点击，只需全局绑定一次
 */
export const initDropdownMenus = () => {
  // 点击事件处理
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const toggleBtn = target.closest(".dropdown-toggle");

    if (toggleBtn) {
      const parent = toggleBtn.closest(".has-submenu");
      if (parent) {
        e.preventDefault();
        e.stopPropagation();
        parent.classList.toggle("expanded");
      }
    }
  });

  // 检查是否启用了鼠标悬浮自动展开功能
  const isHoverEnabled =
    (window as Window & { themeConfig?: { header?: { menu_mouse_hover?: boolean } } }).themeConfig?.header
      ?.menu_mouse_hover === true;

  if (isHoverEnabled) {
    // 鼠标悬浮自动展开
    document.addEventListener(
      "mouseenter",
      (e) => {
        const target = e.target;
        // 确保 target 是 HTMLElement 才调用 closest
        if (!(target instanceof HTMLElement)) return;
        const hasSubmenu = target.closest(".has-submenu");

        if (hasSubmenu) {
          hasSubmenu.classList.add("hover-expanded");
          hasSubmenu.classList.add("expanded");
        }
      },
      true,
    );

    // 鼠标离开自动收起
    document.addEventListener(
      "mouseleave",
      (e) => {
        const target = e.target;
        // 确保 target 是 HTMLElement 才调用 closest
        if (!(target instanceof HTMLElement)) return;
        const hasSubmenu = target.closest(".has-submenu");

        if (hasSubmenu) {
          hasSubmenu.classList.remove("hover-expanded");
          // 如果不是活动菜单项的父菜单，则收起
          const hasActiveChild = hasSubmenu.querySelector(".dropdown-item.active, .sidebar-nav-item.active");
          if (!hasActiveChild) {
            hasSubmenu.classList.remove("expanded");
          }
        }
      },
      true,
    );
  }
};
