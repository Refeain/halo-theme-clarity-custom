/**
 * 瞬间页面独立入口
 */

import "../styles/moments/main.scss";
import { initMomentsTags } from "../modules/moments-tags";

// 自动初始化
document.addEventListener("DOMContentLoaded", () => {
  initMomentsTags();
});

// 支持 Swup 页面切换后的重新初始化
window.addEventListener("swup:success", () => {
  initMomentsTags();
});
