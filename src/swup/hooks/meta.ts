import { getMetaKey, getResourceKey } from "./utils";

// Meta 标签选择器列表
const META_SELECTORS = [
  // 基础 SEO meta 标签
  'meta[name="description"]',
  'meta[name="keywords"]',
  'meta[name="author"]',
  'meta[name="generator"]',
  // Open Graph 标签
  'meta[property^="og:site_name"]',
  'meta[property^="og:locale"]',
  'meta[property^="og:type"]',
  'meta[property^="og:title"]',
  'meta[property^="og:description"]',
  'meta[property^="og:url"]',
  'meta[property^="og:image"]',
  'meta[property^="article:published_time"]',
  'meta[property^="article:modified_time"]',
  'meta[property^="article:author"]',
  'meta[property^="article:section"]',
  'meta[property^="article:tag"]',
  // Twitter Card 标签
  'meta[name^="twitter:card"]',
  'meta[name^="twitter:title"]',
  'meta[name^="twitter:description"]',
  'meta[name^="twitter:image"]',
  'meta[name^="twitter:creator"]',
  // 站点验证标签
  'meta[name="baidu-site-verification"]',
  'meta[name="google-site-verification"]',
  'meta[name="msvalidate.01"]',
  // Canonical link
  'link[rel="canonical"]',
];

// 条件资源选择器（样式和脚本）
const CONDITIONAL_RESOURCE_SELECTORS = ["link[data-swup-conditional]", "script[data-swup-conditional]"];

// 条件样式选择器（仅样式，用于预加载）
const CONDITIONAL_STYLE_SELECTOR = 'link[data-swup-conditional][rel="stylesheet"]';

/**
 * 预加载条件样式
 * 在 Swup 内容替换前调用，提前加载新页面需要的样式，防止闪烁
 *
 * @param responseText - Swup 请求的响应文本
 * @returns Promise<void> - 样式加载完成的 Promise
 */
export const preloadConditionalStyles = async (responseText: string): Promise<void> => {
  if (!responseText) return;

  const parser = new DOMParser();
  const newDoc = parser.parseFromString(responseText, "text/html");

  const newStyles = newDoc.querySelectorAll(CONDITIONAL_STYLE_SELECTOR);
  const loadPromises: Promise<void>[] = [];

  newStyles.forEach((el) => {
    const key = getResourceKey(el);
    if (!key) return;

    const existingSelector = `[data-swup-conditional="${key}"]`;
    if (document.querySelector(existingSelector)) {
      return;
    }

    const href = el.getAttribute("href");
    if (!href) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("data-swup-conditional", key);
    link.setAttribute("data-swup-preload", "true");
    link.href = href;

    const loadPromise = new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
      setTimeout(() => resolve(), 5000);
    });

    loadPromises.push(loadPromise);
    document.head.appendChild(link);
  });

  await Promise.all(loadPromises);
};

/**
 * 更新页面的 meta 标签
 *
 * 在 Swup 页面切换后，从新页面 HTML 中提取并更新以下 meta 标签：
 * - description, keywords, author, generator
 * - Open Graph 标签 (og:site_name, og:locale, og:type, og:title, og:description, og:url, og:image, article:*)
 * - Twitter Card 标签 (twitter:card, twitter:title, twitter:description, twitter:image, twitter:creator)
 * - 站点验证标签 (baidu-site-verification, google-site-verification, msvalidate.01)
 * - canonical link
 * - JSON-LD 结构化数据脚本
 * - 条件资源 (带 data-swup-conditional 属性的样式和脚本)
 *
 * @param html - Swup 请求得到的新页面 HTML
 */
export const updateMetaTags = (html?: string) => {
  if (!html) return;

  const parser = new DOMParser();
  const newDoc = parser.parseFromString(html, "text/html");

  // 收集新页面中所有需要更新的 meta 键
  const newPageMetaKeys = new Set<string>();
  META_SELECTORS.forEach((selector) => {
    newDoc.querySelectorAll(selector).forEach((el) => {
      newPageMetaKeys.add(getMetaKey(el));
    });
  });

  // 删除当前页面中与新页面冲突的 meta 标签（包括初次加载的）
  // 保留：1. 带 data-swup 标记的（会被下面的逻辑处理）
  //       2. 与新页面不冲突的（用户自定义静态 meta）
  META_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      // 如果当前元素有 data-swup 标记，跳过（由后面的统一删除处理）
      if (el.hasAttribute("data-swup")) return;

      // 如果当前元素与新页面的 meta 冲突，则删除
      const key = getMetaKey(el);
      if (newPageMetaKeys.has(key)) {
        el.remove();
      }
    });
  });

  // 删除之前由 Swup 插入的 meta 标签
  document.querySelectorAll('[data-swup="true"]').forEach((el) => el.remove());

  // 使用 Map 去重，确保每个标签只添加一次
  const seenTags = new Map<string, Element>();

  META_SELECTORS.forEach((selector) => {
    const newElements = newDoc.querySelectorAll(selector);

    newElements.forEach((el) => {
      // 生成唯一键用于去重
      const key = getMetaKey(el);

      // 如果已经存在相同的标签，跳过
      if (seenTags.has(key)) return;

      seenTags.set(key, el);

      // 添加新标签到 head，并标记为 Swup 插入
      const clonedEl = el.cloneNode(true) as Element;
      clonedEl.setAttribute("data-swup", "true");
      document.head.appendChild(clonedEl);
    });
  });

  updateJsonLdScripts(newDoc);
  updateConditionalResources(newDoc);
};

/**
 * 更新条件资源（样式和脚本）
 *
 * 处理带 data-swup-conditional 属性的 link 和 script 标签
 * 根据 data-swup-conditional 的值来决定是否加载/卸载资源
 *
 * 使用方式：
 * - 在模板中添加带 data-swup-conditional 属性的资源标签
 * - 属性值作为资源的唯一标识，用于匹配和去重
 * - 例如: <link data-swup-conditional="moments" rel="stylesheet" href="...">
 *
 * @param newDoc - 新页面的对象
 */
const updateConditionalResources = (newDoc: Document) => {
  const newPageResourceKeys = new Set<string>();
  const newPageResources = new Map<string, Element>();

  CONDITIONAL_RESOURCE_SELECTORS.forEach((selector) => {
    newDoc.querySelectorAll(selector).forEach((el) => {
      const key = getResourceKey(el);
      if (key) {
        newPageResourceKeys.add(key);
        newPageResources.set(key, el);
      }
    });
  });

  CONDITIONAL_RESOURCE_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const key = getResourceKey(el);
      if (key && !newPageResourceKeys.has(key) && !el.hasAttribute("data-swup-preload")) {
        if (el.tagName.toLowerCase() === "script") {
          cleanupScriptResource(el);
        }
        el.remove();
      }
    });
  });

  newPageResources.forEach((el, key) => {
    const existingEl = document.querySelector(`[data-swup-conditional="${key}"]`);

    if (existingEl) {
      if (existingEl.hasAttribute("data-swup-preload")) {
        existingEl.removeAttribute("data-swup-preload");
        existingEl.setAttribute("data-swup", "true");
      }
      return;
    }

    // 克隆并添加资源
    const clonedEl = el.cloneNode(true) as Element;
    clonedEl.setAttribute("data-swup", "true");

    // 对于脚本，需要重新创建以确保执行
    if (clonedEl.tagName.toLowerCase() === "script") {
      const script = document.createElement("script");
      Array.from(clonedEl.attributes).forEach((attr) => {
        script.setAttribute(attr.name, attr.value);
      });
      script.textContent = clonedEl.textContent;
      document.head.appendChild(script);
    } else {
      document.head.appendChild(clonedEl);
    }
  });
};

/**
 * 清理脚本资源可能留下的全局状态
 *
 * @param el - 脚本元素
 */
const cleanupScriptResource = (el: Element) => {
  const cleanupEvent = new CustomEvent("swup:script:cleanup", {
    detail: { src: el.getAttribute("src"), id: el.id },
  });
  document.dispatchEvent(cleanupEvent);
};

/**
 * 更新 JSON-LD 结构化数据脚本
 *
 * @param newDoc - 新页面的文档对象
 */
const updateJsonLdScripts = (newDoc: Document) => {
  // 删除当前页面中未标记 data-swup 的 JSON-LD 脚本（初次加载的）
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    if (!el.hasAttribute("data-swup")) {
      el.remove();
    }
  });

  // 删除之前由 Swup 插入的 JSON-LD 脚本
  document.querySelectorAll('script[type="application/ld+json"][data-swup="true"]').forEach((el) => el.remove());

  const newScripts = newDoc.querySelectorAll('script[type="application/ld+json"]');

  // 添加新的 JSON-LD 脚本到 head，并标记为 Swup 插入
  newScripts.forEach((el) => {
    const clonedEl = el.cloneNode(true) as HTMLScriptElement;
    clonedEl.setAttribute("data-swup", "true");
    document.head.appendChild(clonedEl);
  });
};
