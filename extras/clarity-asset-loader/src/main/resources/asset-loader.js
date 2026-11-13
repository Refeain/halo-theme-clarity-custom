(() => {
  if (window.__clarityAssetLoader) {
    window.__clarityAssetLoader();
    return;
  }
  const selectors = {
    steam: 'steam-game-card',
    shiki: 'shiki-code,shiki-code-simple-variant,shiki-code-mac-variant',
    hyperlink: 'hyperlink-card,hyperlink-inline-card',
    summary: 'ai-summaraidgpt,ai-summaraidgpt-data,ai-summaraidgpt-reading,likcc-article-summary,likcc-article-reading',
    statistics: '.xhhaocom-chartboard,.github-statistics-container,.xhhaocom-dataStatistics-v2-traffic-card,.xhhaocom-dataStatistics-v2-traffic-label,.xhhaocom-dataStatistics-v2-traffic-value'
  };
  const resources = new Map();
  let visibilityTargets = new WeakMap();
  const visibilityObservers = new Set();
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
      if (!selector || template.dataset.clarityLoading || !featureIsReady(template, selector)) continue;
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

  function featureIsReady(template, selector) {
    const targets = Array.from(document.querySelectorAll(selector));
    if (!targets.length) return false;
    if (template.dataset.clarityFeature !== 'statistics' || template.dataset.clarityVisible === 'true') return true;

    const Observer = window.IntersectionObserver;
    if (typeof Observer !== 'function') return true;

    let state = visibilityTargets.get(template);
    if (!state) {
      state = { observer: null, observed: new WeakSet() };
      state.observer = new Observer(entries => {
        if (!entries.some(entry => entry.isIntersecting || entry.intersectionRatio > 0)) return;
        template.dataset.clarityVisible = 'true';
        state.observer.disconnect();
        visibilityObservers.delete(state.observer);
        schedule();
      }, { rootMargin: '700px 0px' });
      visibilityTargets.set(template, state);
      visibilityObservers.add(state.observer);
    }
    for (const target of targets) {
      if (state.observed.has(target)) continue;
      state.observed.add(target);
      state.observer.observe(target);
    }
    return false;
  }

  function resetVisibilityObservers() {
    for (const observer of visibilityObservers) observer.disconnect();
    visibilityObservers.clear();
    visibilityTargets = new WeakMap();
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
  document.addEventListener('swup:contentReplaced', () => {
    resetVisibilityObservers();
    schedule();
  });
  document.addEventListener('pjax:complete', () => {
    resetVisibilityObservers();
    schedule();
  });
})();
