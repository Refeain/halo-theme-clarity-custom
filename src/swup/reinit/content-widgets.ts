/**
 * 重新挂载 XhhaoComContentWidgets 内容组件
 * 该插件在首次加载时会自动挂载，Swup 页面切换后需手动调用 mount 处理新内容
 * 重复调用不会重复挂载已经处理过的组件
 */
export const initContentWidgets = () => {
  window.XhhaoComContentWidgets?.mount(document);
};
