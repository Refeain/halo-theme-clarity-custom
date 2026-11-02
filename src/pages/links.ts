/**
 * 友链页面独立入口
 */

import "../styles/links/main.scss";
import { initLinkSubmit } from "../modules/links-submit";

// 自动初始化
document.addEventListener("DOMContentLoaded", () => {
  initLinkSubmit();
});

// 支持 Swup 页面切换后的重新初始化
window.addEventListener("swup:success", () => {
  initLinkSubmit();
});
