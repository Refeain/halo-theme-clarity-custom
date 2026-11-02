/**
 * 朋友圈页面独立入口
 */

import "../styles/friends/main.scss";

interface ArticleData {
  author: string;
  title: string;
  date: string;
  logo: string;
  link: string;
  description?: string;
}

/**
 * 随机文章功能
 */
function initRandomArticle() {
  const randomWrapper = document.querySelector<HTMLElement>("#fcircle-random");
  const articles = document.querySelectorAll<HTMLAnchorElement>(".fcircle-item-container");

  if (!randomWrapper || articles.length === 0) return;

  // 从当前页文章提取数据
  const articlesData: ArticleData[] = Array.from(articles).map((article) => {
    const item = article.closest<HTMLElement>(".fcircle-item");
    const author = article.querySelector<HTMLElement>(".fcircle-item-author")?.textContent || "";
    const title = article.querySelector<HTMLElement>(".fcircle-item-title")?.textContent || "";
    const date = article.querySelector<HTMLElement>(".fcircle-item-date")?.textContent || "";
    const desc = article.querySelector<HTMLElement>(".fcircle-item-desc")?.textContent || "";
    const logo = item?.querySelector<HTMLImageElement>(".fcircle-item-image img")?.src || "";
    const link = article.href;
    return { author, title, date, logo, link, description: desc };
  });

  const randomCard = randomWrapper.querySelector<HTMLAnchorElement>(".fcircle-random-card")!;
  const refreshBtn = randomWrapper.querySelector<HTMLButtonElement>(".fcircle-random-refresh")!;

  // 渲染随机卡片
  function renderRandomCard(data: ArticleData) {
    randomCard.innerHTML = `
			<span class="fcircle-random-author">${data.author}</span>
			<span class="fcircle-random-title-inner">${data.title}</span>
			${data.date ? `<time class="fcircle-random-date">${data.date}</time>` : ""}
		`;
    randomCard.href = data.link;
  }

  // 随机选择并显示
  function showRandom() {
    if (!randomWrapper) return;
    const randomIndex = Math.floor(Math.random() * articlesData.length);
    renderRandomCard(articlesData[randomIndex]);
    randomWrapper.style.display = "flex";
  }

  // 点击文章卡片跳转
  randomCard.addEventListener("click", () => {
    window.open(randomCard.href, "_blank");
  });

  // 点击刷新按钮
  refreshBtn.addEventListener("click", () => {
    refreshBtn.classList.add("is-spinning");
    showRandom();
    setTimeout(() => {
      refreshBtn.classList.remove("is-spinning");
    }, 300);
  });

  // 初始显示
  showRandom();
}

// 自动初始化
document.addEventListener("DOMContentLoaded", () => {
  initRandomArticle();
});

// 支持 Swup 页面切换后的重新初始化
window.addEventListener("swup:success", () => {
  initRandomArticle();
});
