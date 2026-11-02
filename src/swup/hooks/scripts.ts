/**
 * 执行新加载的脚本
 *
 * 遍历 Swup 替换区域中的所有 script 标签，重新创建并执行这些脚本，
 * 确保动态加载的主内容、右侧栏和移动端面板中的 JavaScript 能够正确运行。
 */
export const executeNewScripts = () => {
  const scripts = document.querySelectorAll("#main-content script, #z-aside script, #z-panel script");
  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    if (oldScript.innerHTML) {
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    }
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
};
