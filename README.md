<div align="center">

# Clarity · 玉清滴风小竹楼定制版

基于 [acanyo/theme-clarity](https://github.com/acanyo/theme-clarity) **1.6.18** 的 Halo 主题定制版，用于 [www.yuyt.cn](https://www.yuyt.cn)。

本仓库是**可直接构建、也直接对应线上部署**的完整源码树 —— 既保留上游全部 `src/` 与构建配置，又包含本站所有定制模板与构建产物。

</div>

---

## 📌 这是什么

上游 `acanyo/theme-clarity` 仓库只收录源码，`.gitignore` 排除了 `templates/assets/dist/`（构建产物）。而本站的定制分两类：

1. **模板层定制** —— 改了 `settings.yaml`、`theme.yaml` 和 9 个模板
2. **外挂资产定制** —— 手写的 CSS / JS，从来没有进过上游构建管线

如果只 fork 上游源码，线上这些改动会全部丢失；如果只快照部署目录，又拿不到 `src/` 无法构建。所以本仓库把两者合并成一份完整树。

---

## 🗂 目录结构

```
├── src/                      # 上游 TypeScript / SCSS 源码（268 文件，未改动）
├── templates/
│   ├── *.html                # 页面模板（含本站新增 doc.html / docs.html / doc-catalog.html）
│   ├── modules/              # 片段模板（含本站新增 modules/doc/doc-tree.html）
│   └── assets/
│       ├── dist/             # 构建产物（142 文件，由 vite 生成，本站已提交）
│       ├── custom/           # ★ 本站手写资产（8 文件，vite 不会碰）
│       ├── fonts/  images/  libs/
├── docs/                     # 上游文档
├── build.gradle  vite.config.ts  package.json  tsconfig.json
└── settings.yaml  theme.yaml  annotation-setting.yaml
```

### 为什么手写资产放在 `assets/custom/`

`vite.config.ts` 里 `outDir: "./templates/assets/dist"` 且 **`emptyOutDir: true`** —— 每次构建都会先清空 `dist/`。本站的手写 CSS/JS 原本混在 `dist/` 里，一旦真跑 `pnpm build` 就会被删掉。

因此把它们迁到平级的 `assets/custom/`，模板引用同步改为 `/assets/custom/xxx.css`。Halo 对 `templates/assets/` 下任意子目录都能正常 serve（已实测 200）。

---

## ✨ 本站相对上游的定制点

### 模板改动（9 个文件）

| 文件 | 改动内容 |
| --- | --- |
| `settings.yaml` | 大量站点配置调整（59 KB） |
| `theme.yaml` | 版本 1.6.18、描述改成本站说明 |
| `templates/modules/head.html` | 引入 docs.css、自定义 meta、字体优化 |
| `templates/modules/layout.html` | 引入 footer/plugin-fix/su-reader/site-custom |
| `templates/modules/footer.html` | **重写为 Cosolar 风格页脚**（品牌区 + 网站统计 + 邮件订阅） |
| `templates/moment.html` | 瞬间页定制 |
| `templates/equipments.html` | 装备页定制 |
| `templates/modules/aside-widgets/recent-comments-widget.html` | 侧栏最近评论 |
| `templates/modules/aside-widgets/tech-info-widget.html` | 侧栏技术信息 |

### 新增模板（4 个）

`templates/doc.html`、`templates/docs.html`、`templates/doc-catalog.html`、`templates/modules/doc/doc-tree.html`

> 这 4 个是给 **docsme 插件**做模板覆盖用的。插件未启用时对应路由 404 属正常。

### 手写资产（`templates/assets/custom/`，8 个）

| 文件 | 用途 | 是否被引用 |
| --- | --- | --- |
| `footer.css` | Cosolar 页脚样式 | ✅ layout.html |
| `plugin-fix.css` | 第三方插件样式修复 | ✅ layout.html |
| `su-reader.css` | 阅读体验增强 | ✅ layout.html |
| `site-custom.js` | 站点自定义脚本 | ✅ layout.html |
| `docs.css` | 文档页样式 | ✅ head.html |
| `qqweather.js` / `qqweather.css` | 天气组件 | ❌ 未引用（实际走 nginx 反代 `/qqweather`） |
| `hitokoto-blue.css` | 一言配色 | ❌ 未引用（实际由 nginx `sub_filter` 注入） |

后 3 个保留是为了**与线上目录一致**，可随时删除。

### 构建产物（`templates/assets/dist/`，142 个）

上游不提交，本站提交 —— 因为线上就是直接跑这份产物，无法在本机重建（见下）。已剔除 4 个无引用的陈旧残留（`qrcode.CV2jjU1W.js`、`swup.cPbFLmoC.js`、`twikoo.CuoVfIYJ.js`、`vendor.DZ52Q6Tw.js`）。

---

## ⚠️ 构建说明

### 依赖

需要 Node 22+、pnpm 10.x：

```bash
pnpm install
pnpm build-only   # tsc && vite build
pnpm build        # 完整打包成 theme zip
```

### 已知问题

1. **`vite build` 在受限沙箱中会 `spawn EPERM`** —— esbuild 需要启动子进程，本仓库的定制是在一台禁止子进程的环境里完成的，所以 `dist/` 是**直接提交的**而非由 CI 生成。`tsc` 类型检查可正常通过。

2. **`package.json` 里的 `overwrites` 字段**（注意拼写）是上游笔误，标准字段应为 `overrides`，pnpm 不认这个字段。上游用它把 `vite` 换成 `rolldown-vite`，本仓库未修正，保持与上游一致。

3. **缓存戳是硬编码的** —— `head.html` / `layout.html` 里所有 `assets/dist/*` 和 `assets/custom/*` 的引用都带固定的 `?v=20261102`，不读 manifest。**改动任何 `assets/` 下的文件都要同步 bump 这两个文件里的 `?v=`**，否则 CDN 会一直用旧缓存。

### 重新构建后要注意

`vite build` 会清空 `dist/` 重新生成，产物的 hash 会变。构建完记得：

1. 确认 `assets/custom/` 没被误删（正常不会，它在 dist 之外）
2. Bump `head.html` / `layout.html` 里的 `?v=`
3. 部署后用 `docker restart 1Panel-halo-*` 让模板生效（Halo 不对模板做热重载）

---

## 🚀 部署

本站目录：`/opt/1panel/apps/halo/halo/data/themes/theme-clarity`

```bash
# 打包（服务器上没有 zip 命令，用 python）
python3 -c "
import zipfile, os
z = zipfile.ZipFile('/tmp/theme-clarity.zip', 'w', zipfile.ZIP_DEFLATED)
for r, _, fs in os.walk('.'):
    for f in fs:
        z.write(os.path.join(r, f))
z.close()"

# 部署
TH=/opt/1panel/apps/halo/halo/data/themes
mv $TH/theme-clarity $TH/theme-clarity.old
cp -a staged $TH/theme-clarity
docker restart 1Panel-halo-*
```

> ⚠️ **只拷贝主题目录不会更新 Halo 数据库里的主题注册信息**。页脚 `Theme Clarity x.y.z` 读的是数据库 `extensions` 表里 `/registry/theme.halo.run/themes/theme-clarity` 这条记录的 `spec.version`，不是磁盘上的 `theme.yaml`。升级版本号时需要同步改数据库：

```sql
-- 表 extensions 只有三列：name / data (bytea) / version
SELECT convert_from(data, 'UTF8')
FROM extensions
WHERE name = '/registry/theme.halo.run/themes/theme-clarity';
```

改 `data` 里的 `"version"` 与 `"requires"` 字段后写回即可。

---

## 📄 许可证

沿用上游 **GPL-3.0**（见 [LICENSE](./LICENSE)）。

## 🙏 致谢

- [acanyo/theme-clarity](https://github.com/acanyo/theme-clarity) —— 上游主题作者 Handsome
- [L33Z22L11/blog-v3](https://github.com/L33Z22L11/blog-v3) —— 上游的设计来源，作者 纸鹿
- [Halo](https://halo.run) —— 建站工具

---

<div align="center">

**上游主题问题请反馈到 [acanyo/theme-clarity](https://github.com/acanyo/theme-clarity/issues)**
**本站定制问题请反馈到本仓库 Issues**

</div>
