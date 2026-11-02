let asideScrollSyncCleanup: (() => void) | null = null;

const DESKTOP_QUERY = "(min-width: 1081px)";

export const initAsideScrollSync = () => {
  if (asideScrollSyncCleanup) {
    asideScrollSyncCleanup();
    asideScrollSyncCleanup = null;
  }

  const aside = document.getElementById("z-aside");
  const main = document.getElementById("main-content");
  const hasToc = Boolean(document.getElementById("catalog-widget"));
  const mediaQuery = window.matchMedia(DESKTOP_QUERY);

  if (!aside || !main || hasToc) return;

  let rafId = 0;

  const syncAsideScroll = () => {
    rafId = 0;

    if (!mediaQuery.matches) return;

    const maxAsideScroll = aside.scrollHeight - aside.clientHeight;
    if (maxAsideScroll <= 0) return;

    const documentElement = document.documentElement;
    const maxPageScroll = Math.max(1, documentElement.scrollHeight - window.innerHeight);
    const pageProgress = Math.min(1, Math.max(0, window.scrollY / maxPageScroll));

    aside.scrollTop = maxAsideScroll * pageProgress;
  };

  const scheduleSync = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(syncAsideScroll);
  };

  window.addEventListener("scroll", scheduleSync, { passive: true });
  window.addEventListener("resize", scheduleSync);
  mediaQuery.addEventListener("change", scheduleSync);
  scheduleSync();

  asideScrollSyncCleanup = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    window.removeEventListener("scroll", scheduleSync);
    window.removeEventListener("resize", scheduleSync);
    mediaQuery.removeEventListener("change", scheduleSync);
  };
};
