const normalizeNavPath = (urlLike: string): string | null => {
  try {
    const url = new URL(urlLike, window.location.origin);
    let path = (url.pathname || "/").replace(/\/{2,}/g, "/");

    if (!path) {
      return "/";
    }

    if (path !== "/") {
      path = path.replace(/\/+$/, "");
    }

    return path || "/";
  } catch (_error) {
    return null;
  }
};

const scoreNavLink = (currentUrl: URL, href: string): number => {
  if (!href || href === "#") {
    return -1;
  }

  let linkUrl: URL;
  try {
    linkUrl = new URL(href, currentUrl.origin);
  } catch (_error) {
    return -1;
  }

  if (linkUrl.origin !== currentUrl.origin) {
    return -1;
  }

  const currentPath = normalizeNavPath(currentUrl.href);
  const linkPath = normalizeNavPath(linkUrl.href);
  if (!currentPath || !linkPath) {
    return -1;
  }

  if (linkPath === "/") {
    return currentPath === "/" || currentPath.startsWith("/page/") ? 3000 : -1;
  }

  if (linkPath === currentPath) {
    return (currentUrl.search === linkUrl.search ? 5000 : 4200) + linkPath.length;
  }

  if (currentPath.startsWith(linkPath + "/")) {
    return 2000 + linkPath.length;
  }

  return -1;
};

export const syncActiveNavItem = () => {
  if (document.documentElement.dataset.navActive === "false") return;

  const currentUrl = new URL(window.location.href);
  const navItems = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(".sidebar-nav-item[href], .dropdown-item[href]"),
  );

  if (!navItems.length) {
    return;
  }

  navItems.forEach((item) => {
    item.classList.remove("active");
    item.removeAttribute("aria-current");
  });

  document.querySelectorAll(".has-submenu.expanded").forEach((menu) => {
    menu.classList.remove("expanded");
  });

  let bestItem: HTMLAnchorElement | null = null;
  let bestScore = -1;

  navItems.forEach((item) => {
    const href = item.getAttribute("href");
    if (!href) {
      return;
    }

    const score = scoreNavLink(currentUrl, href);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  });

  if (!bestItem) {
    return;
  }

  const activeItem = bestItem as HTMLAnchorElement;
  activeItem.classList.add("active");
  activeItem.setAttribute("aria-current", "page");

  const parentSubmenu = activeItem.closest(".has-submenu");
  if (parentSubmenu) {
    parentSubmenu.classList.add("expanded");
    const parentLink = parentSubmenu.querySelector<HTMLAnchorElement>(".sidebar-nav-item.has-dropdown");
    if (parentLink && parentLink !== activeItem) {
      parentLink.classList.add("active");
    }
  }
};
