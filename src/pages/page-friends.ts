/**
 * 朋友圈页面（新版）独立入口
 * 用于单页自定义模板 page_friends.html，数据来源：链接插件 plugin-links 的 linkFeedFinder。
 * 浏览方式：首屏 SSR + 游标「加载更多」（匿名 REST /linkfeeds 增量追加），并提供随机阅读。
 * JS 逻辑与旧版 friends.ts 完全独立；样式复用 friends.css（由 page-friends-head 加载）。
 */

const FEED_API = "/apis/api.link.halo.run/v1alpha1/linkfeeds";

interface FeedItem {
  url?: string;
  title?: string;
  summary?: string;
  author?: string;
  authorUrl?: string;
  authorLogo?: string;
  publishedAt?: string;
}

interface FeedPage {
  items?: FeedItem[];
  nextBeforePublishedAt?: string | null;
  nextBeforeId?: string | null;
  hasNext?: boolean;
}

interface ArticleData {
  author: string;
  title: string;
  date: string;
  logo: string;
  link: string;
}

type Mode = "card" | "list";

/** 读取模板注入的配置 */
function getConfig(): { feedLimit: number; enableRandom: boolean } {
  const cfg = (window as unknown as { friendsPageConfig?: Record<string, unknown> }).friendsPageConfig || {};
  const n = parseInt(String(cfg.feedLimit), 10);
  return {
    feedLimit: Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 30,
    enableRandom: cfg.enableRandom !== false,
  };
}

/** 当前展示模式：列表容器是 .fcircle-articles 则为列表模式，否则卡片模式 */
function getMode(): Mode {
  const list = document.getElementById("friends-list");
  return list && list.classList.contains("fcircle-articles") ? "list" : "card";
}

/** 仅允许 http(s) 链接，避免 javascript: 等注入 */
function safeUrl(url?: string): string {
  return url && /^https?:\/\//i.test(url) ? url : "#";
}

/** 格式化发布时间：卡片模式 MM-dd，列表模式 yyyy-MM-dd */
function formatDate(iso: string | undefined, mode: Mode): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return mode === "list" ? `${y}-${m}-${day}` : `${m}-${day}`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/** 渲染卡片模式条目（结构与 page_friends.html 的 .friend-card 一致） */
function renderCardItem(item: FeedItem, index: number): HTMLElement {
  const article = el("article", "friend-card");
  article.style.setProperty("--delay", `${index * 0.03}s`);

  const header = el("header", "friend-header");
  const authorInfo = el("a", "author-info");
  authorInfo.href = safeUrl(item.authorUrl);
  authorInfo.target = "_blank";
  authorInfo.rel = "noopener";
  if (item.authorLogo) {
    const img = el("img", "author-avatar");
    img.loading = "lazy";
    img.src = item.authorLogo;
    img.alt = item.author || "";
    authorInfo.appendChild(img);
  } else {
    const ph = el("span", "author-avatar-placeholder");
    ph.appendChild(el("span", "icon-[ph--user-bold]"));
    authorInfo.appendChild(ph);
  }
  const name = el("span", "author-name");
  name.textContent = item.author || "";
  authorInfo.appendChild(name);
  header.appendChild(authorInfo);

  const dateStr = formatDate(item.publishedAt, "card");
  if (dateStr) {
    const time = el("time", "friend-time");
    if (item.publishedAt) time.dateTime = item.publishedAt;
    time.textContent = dateStr;
    header.appendChild(time);
  }
  article.appendChild(header);

  const content = el("a", "friend-content");
  content.href = safeUrl(item.url);
  content.target = "_blank";
  content.rel = "noopener";
  const title = el("h2", "friend-title");
  title.textContent = item.title || "";
  content.appendChild(title);
  if (item.summary) {
    const desc = el("p", "friend-desc");
    desc.textContent = item.summary;
    content.appendChild(desc);
  }
  article.appendChild(content);

  const footer = el("footer", "friend-footer");
  const more = el("a", "read-more");
  more.href = safeUrl(item.url);
  more.target = "_blank";
  more.rel = "noopener";
  const moreText = el("span");
  moreText.textContent = "阅读原文";
  more.append(moreText, el("span", "icon-[ph--arrow-up-right-bold]"));
  footer.appendChild(more);
  article.appendChild(footer);

  return article;
}

/** 渲染列表模式条目（结构与 page_friends.html 的 .fcircle-item 一致） */
function renderListItem(item: FeedItem, index: number): HTMLElement {
  const wrap = el("div", "fcircle-item");
  wrap.style.setProperty("--delay", `${index * 0.03}s`);

  if (item.authorLogo) {
    const imgLink = el("a", "fcircle-item-image");
    imgLink.href = safeUrl(item.authorUrl);
    imgLink.target = "_blank";
    imgLink.rel = "noopener";
    const img = el("img");
    img.loading = "lazy";
    img.src = item.authorLogo;
    img.alt = item.author || "";
    imgLink.appendChild(img);
    wrap.appendChild(imgLink);
  } else {
    const ph = el("a", "fcircle-avatar-placeholder");
    ph.href = safeUrl(item.authorUrl);
    ph.target = "_blank";
    ph.rel = "noopener";
    ph.appendChild(el("span", "icon-[ph--user-bold]"));
    wrap.appendChild(ph);
  }

  const container = el("a", "fcircle-item-container gradient-card");
  container.href = safeUrl(item.url);
  container.target = "_blank";
  container.rel = "noopener";
  const head = el("div", "fcircle-item-header");
  const author = el("span", "fcircle-item-author");
  author.textContent = item.author || "";
  const title = el("span", "fcircle-item-title");
  title.textContent = item.title || "";
  head.append(author, title);
  const dateStr = formatDate(item.publishedAt, "list");
  if (dateStr) {
    const time = el("time", "fcircle-item-date");
    if (item.publishedAt) time.dateTime = item.publishedAt;
    time.textContent = dateStr;
    head.appendChild(time);
  }
  container.appendChild(head);
  if (item.summary) {
    const desc = el("span", "fcircle-item-desc");
    desc.textContent = item.summary;
    container.appendChild(desc);
  }
  wrap.appendChild(container);
  return wrap;
}

function renderItem(item: FeedItem, mode: Mode, index: number): HTMLElement {
  return mode === "list" ? renderListItem(item, index) : renderCardItem(item, index);
}

/** 更新「已加载 N 篇」统计（#friends-count），N = 当前已渲染条目数 */
function updateCount(listEl: HTMLElement) {
  const countEl = document.getElementById("friends-count");
  if (!countEl) return;
  countEl.textContent = String(listEl.querySelectorAll(".friend-card, .fcircle-item").length);
}

/**
 * 游标「加载更多」：fetch 匿名 REST，按 nextBeforePublishedAt + nextBeforeId 继续取，渲染追加
 */
async function loadMore(btn: HTMLButtonElement, listEl: HTMLElement, mode: Mode, limit: number) {
  if (btn.dataset.loading === "1") return;

  const textEl = btn.querySelector<HTMLElement>(".friends-load-more-text");
  const original = textEl?.textContent || "加载更多";
  btn.dataset.loading = "1";
  btn.disabled = true;
  if (textEl) textEl.textContent = "加载中…";

  try {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (btn.dataset.beforePublishedAt) params.set("beforePublishedAt", btn.dataset.beforePublishedAt);
    if (btn.dataset.beforeId) params.set("beforeId", btn.dataset.beforeId);

    const res = await fetch(`${FEED_API}?${params.toString()}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const page = (await res.json()) as FeedPage;
    const items = Array.isArray(page.items) ? page.items : [];

    const startIndex = listEl.children.length;
    const fragment = document.createDocumentFragment();
    items.forEach((it, i) => fragment.appendChild(renderItem(it, mode, startIndex + i)));
    listEl.appendChild(fragment);
    updateCount(listEl);

    if (page.hasNext && (page.nextBeforePublishedAt || page.nextBeforeId)) {
      btn.dataset.beforePublishedAt = page.nextBeforePublishedAt || "";
      btn.dataset.beforeId = page.nextBeforeId || "";
      btn.dataset.loading = "";
      btn.disabled = false;
      if (textEl) textEl.textContent = original;
    } else {
      // 没有更多了，移除按钮
      (btn.closest(".friends-load-more") || btn).remove();
    }
  } catch {
    btn.dataset.loading = "";
    btn.disabled = false;
    if (textEl) textEl.textContent = "加载失败，点击重试";
  }
}

/** 从条目 DOM 提取文章数据（随机用，兼容两种模式） */
function extractData(item: HTMLElement): ArticleData {
  if (item.classList.contains("friend-card")) {
    const link = item.querySelector<HTMLAnchorElement>(".friend-content");
    return {
      author: item.querySelector(".author-name")?.textContent?.trim() || "",
      title: item.querySelector(".friend-title")?.textContent?.trim() || "",
      date: item.querySelector(".friend-time")?.textContent?.trim() || "",
      logo: item.querySelector<HTMLImageElement>(".author-avatar")?.src || "",
      link: link?.href || "",
    };
  }
  const container = item.querySelector<HTMLAnchorElement>(".fcircle-item-container");
  return {
    author: item.querySelector(".fcircle-item-author")?.textContent?.trim() || "",
    title: item.querySelector(".fcircle-item-title")?.textContent?.trim() || "",
    date: item.querySelector(".fcircle-item-date")?.textContent?.trim() || "",
    logo: item.querySelector<HTMLImageElement>(".fcircle-item-image img")?.src || "",
    link: container?.href || "",
  };
}

/**
 * 随机阅读：从当前已渲染（含已「加载更多」的）全部条目中随机抽取
 */
function initRandomArticle(enableRandom: boolean) {
  const randomWrapper = document.getElementById("fcircle-random");
  if (!randomWrapper) return;

  const randomCard = randomWrapper.querySelector<HTMLAnchorElement>(".fcircle-random-card");
  const refreshBtn = randomWrapper.querySelector<HTMLButtonElement>(".fcircle-random-refresh");
  if (!randomCard || !refreshBtn) return;

  const collect = (): ArticleData[] => {
    const list = document.getElementById("friends-list");
    if (!list) return [];
    return Array.from(list.querySelectorAll<HTMLElement>(".friend-card, .fcircle-item"))
      .map(extractData)
      .filter((d) => d.link && d.link !== "#");
  };

  if (!enableRandom || collect().length === 0) {
    randomWrapper.style.display = "none";
    return;
  }

  const renderRandomCard = (data: ArticleData) => {
    randomCard.innerHTML = "";
    const author = el("span", "fcircle-random-author");
    author.textContent = data.author;
    const title = el("span", "fcircle-random-title-inner");
    title.textContent = data.title;
    randomCard.append(author, title);
    if (data.date) {
      const time = el("time", "fcircle-random-date");
      time.textContent = data.date;
      randomCard.append(time);
    }
    randomCard.href = data.link;
  };

  const showRandom = () => {
    const data = collect();
    if (data.length === 0) return;
    renderRandomCard(data[Math.floor(Math.random() * data.length)]);
    randomWrapper.style.display = "flex";
  };

  refreshBtn.onclick = () => {
    refreshBtn.classList.add("is-spinning");
    showRandom();
    setTimeout(() => refreshBtn.classList.remove("is-spinning"), 300);
  };

  showRandom();
}

function initFriendsPage() {
  const listEl = document.getElementById("friends-list");
  if (!listEl) return;

  const { feedLimit, enableRandom } = getConfig();
  const mode = getMode();

  updateCount(listEl);

  const btn = document.getElementById("friends-load-more-btn") as HTMLButtonElement | null;
  if (btn && btn.dataset.bound !== "1") {
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => loadMore(btn, listEl, mode, feedLimit));
  }

  initRandomArticle(enableRandom);
}

document.addEventListener("DOMContentLoaded", initFriendsPage);

// 支持 Swup 页面切换后的重新初始化
window.addEventListener("swup:success", initFriendsPage);
