import { syncActiveNavItem } from "./active-nav-shared";

/**
 * 初始化导航栏活动项
 * 根据当前页面路径设置对应的导航项为活动状态，并展开父菜单
 */
export const initActiveNavItem = () => {
  syncActiveNavItem();
};
