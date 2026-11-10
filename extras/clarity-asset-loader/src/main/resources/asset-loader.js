(() => {
  if (window.__clarityAssetLoader) {
    window.__clarityAssetLoader();
    return;
  }
  const selectors = {
    steam: 'steam-game-card',
    shiki: 'shiki-code,shiki-code-simple-variant,shiki-code-mac-variant',
    hyperlink: 'hyperlink-card,hyperlink-inline-card',
    summary: 'ai-summaraidgpt,ai-summaraidgpt-data,ai-summaraidgpt-reading,likcc-article-summary,likcc-article-reading'
  };
  const resources = new Map();
  let queued = false;

  function load(original) {
    const isScript = original.tagName === 'SCRIPT';
    const url = original.getAttribute(isScript ? 'src' : 'href');
    if (resources.has(url)) return resources.get(url);
    const existing = Array.from(document.head.querySelectorAll(isScript ? 'script[src]' : 'link[rel="stylesheet"][href]'))
      .some(node => node.getAttribute(isScript ? 'src' : 'href') === url);
    if (existing) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const node = document.createElement(isScript ? 'script' : 'link');
      for (const attr of original.attributes) node.setAttribute(attr.name, attr.value);
      if (isScript) node.async = false;
      node.onload = resolve;
      node.onerror = () => {
        node.remove();
        resources.delete(url);
        reject(new Error('Asset failed: ' + url));
      };
      document.head.appendChild(node);
    });
    resources.set(url, promise);
    return promise;
  }

  function scan() {
    queued = false;
    for (const template of document.querySelectorAll('template[data-clarity-feature]')) {
      const selector = selectors[template.dataset.clarityFeature];
      if (!selector || template.dataset.clarityLoading || !document.querySelector(selector)) continue;
      template.dataset.clarityLoading = 'true';
      const nodes = Array.from(template.content.querySelectorAll('link[rel="stylesheet"][href],script[src]'));
      const styles = nodes.filter(node => node.tagName === 'LINK');
      const scripts = nodes.filter(node => node.tagName === 'SCRIPT');
      Promise.all(styles.map(load))
        .then(async () => { for (const script of scripts) await load(script); })
        .catch(error => {
          console.warn('[Clarity assets]', error);
          const retries = Number(template.dataset.clarityRetries || 0);
          if (retries < 2) {
            template.dataset.clarityRetries = String(retries + 1);
            setTimeout(() => {
              delete template.dataset.clarityLoading;
              schedule();
            }, 1000 * (retries + 1));
          }
        });
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(scan);
  }
  window.__clarityAssetLoader = schedule;
  function start() {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  document.addEventListener('swup:contentReplaced', schedule);
  document.addEventListener('pjax:complete', schedule);
})();
