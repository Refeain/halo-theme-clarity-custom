import { syncActiveNavItem } from "../../modules/active-nav-shared";

/**
 * 更新导航项的激活状态
 *
 * 根据当前页面路径更新侧边栏导航项的激活状态，
 * 同时保持之前展开的菜单状态。
 */
export const updateActiveNavItem = () => {
  syncActiveNavItem();
};
