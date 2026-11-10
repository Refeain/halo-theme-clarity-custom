# 首页排序功能合并记录

2026-11-10：在 Clarity 1.6.18 本站定制版上合入上游 1.6.19 的首页排序功能。

上游差异：https://github.com/acanyo/theme-clarity/compare/1.6.18...1.6.19

## 行为

- 默认首页保持原有最新发布顺序。
- 首页文章列表工具栏可切换到 `/?sort=update`，按最后修改时间降序展示，并显示更新时间。
- 上一页、下一页和页码跳转保留排序参数；分类、标签继续使用原有路由。

## 合并方式

- 合并 `index.html`、`modules/order-toggle.html`、`modules/post-list.html`、`modules/pagination.html`。
- 只在最近更新模式查询修改时间排序数据，默认模式不增加查询。
- 排序样式独立放在 `templates/assets/custom/home-sort.css`，由 `modules/layout.html` 引入，缓存版本为 `20261110`。无需重建原有主 CSS。
- 排序图标使用内联 SVG，无需向已有编译产物补充图标样式。
- 保留现有页脚、字体、图库补丁、主 CSS 和其他定制。主题版本仍标记为 1.6.18，未宣称完成整包升级。

## 验证

线上已部署并完成 29 项服务端检查：首页默认顺序与合并前一致；最近更新两页共 16 篇文章与 Halo API 顺序一致且无重复；两种排序的分页地址正确；文章、分类、标签、归档、图库和新增 CSS 返回 200；容器状态 healthy。原有 399 个未修改文件的哈希保持一致。

验证通过服务器本机请求及文件哈希完成；未执行浏览器视觉检查和公网 CDN 缓存检查。完整备份及验证记录保存在服务器的 `data/theme-backups/clarity-before-home-sort-20261110-181342/`。
