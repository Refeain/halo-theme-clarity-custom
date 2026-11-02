/**
 * 生成 meta 标签的唯一键用于去重
 *
 * @param el - meta 或 link 元素
 * @returns 唯一键字符串
 */
export const getMetaKey = (el: Element): string => {
  const name = el.getAttribute("name") || "";
  const property = el.getAttribute("property") || "";
  const rel = el.getAttribute("rel") || "";
  const content = el.getAttribute("content") || "";
  const href = el.getAttribute("href") || "";

  // 对于 link[rel="canonical"]，使用 rel + href 作为键
  if (rel === "canonical") {
    return `link:${rel}:${href}`;
  }

  // 对于 meta 标签，使用 name 或 property 作为键（只保留第一个）
  if (property) {
    return `meta:property:${property}`;
  }

  if (name) {
    return `meta:name:${name}`;
  }

  // 其他情况使用内容作为键
  return `meta:content:${content}`;
};

/**
 * 检查当前路径是否匹配导航链接路径
 * 确保 /post 不会匹配 /postman，但会匹配 /post/123
 *
 * @param currentPath - 当前页面路径
 * @param href - 导航链接路径
 * @returns 是否匹配
 */
export const isPathMatch = (currentPath: string, href: string): boolean => {
  if (currentPath === href) return true;
  if (!href.startsWith("/")) return false;

  // 检查前缀匹配，确保是完整路径段匹配
  // /post 应该匹配 /post/123，但不匹配 /postman
  // 方法：确保 currentPath 以 href + "/" 开头，或者 currentPath 等于 href
  if (currentPath.startsWith(href + "/")) return true;

  return false;
};

/**
 * 获取条件资源的唯一键
 * 用于 data-swup-conditional 属性的资源标识
 *
 * @param el - link 或 script 元素
 * @returns 资源的唯一键，如果没有 data-swup-conditional 属性则返回 null
 */
export const getResourceKey = (el: Element): string | null => {
  const conditionalValue = el.getAttribute("data-swup-conditional");
  if (!conditionalValue) return null;

  const tagName = el.tagName.toLowerCase();
  const rel = el.getAttribute("rel") || "";
  const src = el.getAttribute("src") || "";
  const href = el.getAttribute("href") || "";

  // 使用 data-swup-conditional 值作为基础键
  // 结合标签类型和资源路径确保唯一性
  if (tagName === "link" && rel === "stylesheet") {
    return `css:${conditionalValue}:${href}`;
  }

  if (tagName === "script") {
    return `js:${conditionalValue}:${src}`;
  }

  // 其他类型的资源
  return `${tagName}:${conditionalValue}:${href || src}`;
};
