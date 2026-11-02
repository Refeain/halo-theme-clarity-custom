/**
 * 同步主题配置
 * 从页面中的配置脚本标签读取并更新全局主题配置
 */
export const syncThemeConfig = () => {
  const configScript = document.querySelector("script[data-theme-config]");
  if (configScript) {
    const newConfig = configScript.textContent;
    if (newConfig) {
      try {
        const config = JSON.parse(newConfig);
        window.themeConfig = { ...window.themeConfig, ...config };
      } catch (e) {
        console.error("Failed to parse theme config:", e);
      }
    }
  }
};
