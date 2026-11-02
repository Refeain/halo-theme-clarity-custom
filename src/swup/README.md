# Swup 开发者适配文档

主题使用 Swup 接管站内页面访问与转场。运行时入口位于 `src/swup/swup.ts`，生命周期注册位于 `src/swup/hooks/index.ts`，页面切换后的组件重初始化位于 `src/swup/reinit/index.ts`。

## 配置

Swup 仅在主题配置显式启用时工作：

```ts
window.themeConfig?.custom?.enable_swup === true
```

相关配置：

- `enable_swup`：启用 Swup。
- `swup_timeout`：请求超时时间，默认 5000ms。

## 生命周期事件

内部使用 Swup hooks，并向业务代码派发以下窗口事件：

- `swup:start`：访问开始。
- `swup:success`：新页面内容已替换，脚本执行和组件重初始化即将完成。
- `swup:complete`：访问结束。
- `swup:error`：请求失败。

页面脚本需要在无刷新切换后重新执行逻辑时，应监听 `swup:success`：

```ts
window.addEventListener("swup:success", () => {
  // re-init page logic
});
```

## 排除链接

给链接添加 `data-no-swup` 后，Swup 会忽略该访问：

```html
<a href="/console" data-no-swup>Console</a>
```

## 条件资源

只在特定页面需要的样式或脚本使用 `data-swup-conditional` 标记。系统会在进入页面时加载，离开页面时卸载。

```html
<link data-swup-conditional="photos" rel="stylesheet" href="/assets/dist/photos.css" />
<script data-swup-conditional="photos" src="/assets/dist/photos.js"></script>
```

卸载脚本资源前会派发 `swup:script:cleanup`，页面级脚本可以在该事件里清理全局状态。
