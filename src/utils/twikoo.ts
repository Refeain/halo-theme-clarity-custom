interface TwikooInstance {
  init: (options: Record<string, unknown>) => void | Promise<void>;
}

let localLoader: Promise<TwikooInstance> | null = null;
const remoteLoaderMap = new Map<string, Promise<TwikooInstance>>();

const normalizeTwikooModule = (module: unknown): TwikooInstance => {
  if (module && typeof module === "object") {
    const maybeModule = module as { init?: unknown; default?: unknown };

    if (typeof maybeModule.init === "function") {
      return maybeModule as TwikooInstance;
    }

    if (maybeModule.default && typeof maybeModule.default === "object") {
      const maybeDefault = maybeModule.default as { init?: unknown };
      if (typeof maybeDefault.init === "function") {
        return maybeDefault as TwikooInstance;
      }
    }
  }

  throw new Error("Twikoo 模块缺少 init 方法");
};

const getWindowTwikoo = (): TwikooInstance | null => {
  const twikoo = (window as Window & { twikoo?: unknown }).twikoo as { init?: unknown } | undefined;
  if (twikoo && typeof twikoo.init === "function") {
    return twikoo as TwikooInstance;
  }
  return null;
};

const loadLocalTwikoo = async (): Promise<TwikooInstance> => {
  if (!localLoader) {
    localLoader = import("twikoo").then((module) => normalizeTwikooModule(module));
  }
  return localLoader;
};

const loadRemoteTwikoo = (scriptUrl: string): Promise<TwikooInstance> => {
  const existed = getWindowTwikoo();
  if (existed) {
    return Promise.resolve(existed);
  }

  const loading = remoteLoaderMap.get(scriptUrl);
  if (loading) {
    return loading;
  }

  const promise = new Promise<TwikooInstance>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.dataset.twikooSource = scriptUrl;

    script.onload = () => {
      const loaded = getWindowTwikoo();
      if (loaded) {
        resolve(loaded);
      } else {
        reject(new Error("Twikoo 脚本加载成功但未找到 window.twikoo"));
      }
    };

    script.onerror = () => reject(new Error(`Twikoo 脚本加载失败: ${scriptUrl}`));
    document.head.appendChild(script);
  });

  remoteLoaderMap.set(scriptUrl, promise);

  return promise.catch((error) => {
    remoteLoaderMap.delete(scriptUrl);
    throw error;
  });
};

const resolveScriptUrl = (container: HTMLElement): string => {
  const customUrl = container.dataset.twikooCustomUrl?.trim();
  if (customUrl) {
    return customUrl;
  }
  return "/themes/theme-clarity/assets/libs/twikoo/twikoo.min.js";
};

const getTwikooInstance = async (container: HTMLElement): Promise<TwikooInstance> => {
  const scriptUrl = resolveScriptUrl(container);

  try {
    return await loadRemoteTwikoo(scriptUrl);
  } catch (error) {
    console.warn("Twikoo 远程脚本加载失败，回退到本地依赖。", error);
    return loadLocalTwikoo();
  }
};

const buildTwikooOptions = (container: HTMLElement, index: number): Record<string, unknown> | null => {
  const envId = container.dataset.twikooEnvId?.trim();
  if (!envId) {
    console.warn("Twikoo envId 未配置，已跳过初始化。");
    return null;
  }

  if (!container.id) {
    container.id = `twikoo-comment-${index + 1}`;
  }

  const path = container.dataset.twikooPath?.trim() || window.location.pathname;
  const options: Record<string, unknown> = {
    envId,
    el: `#${container.id}`,
    path: path.startsWith("/") ? path : `/${path}`,
  };

  const accessToken = container.dataset.twikooAccessToken?.trim();
  if (accessToken) {
    options.accessToken = accessToken;
  }

  const region = container.dataset.twikooRegion?.trim();
  if (region) {
    options.region = region;
  }

  const lang = container.dataset.twikooLang?.trim();
  if (lang) {
    options.lang = lang;
  }

  return options;
};

export const initTwikooComments = async () => {
  const containers = Array.from(document.querySelectorAll<HTMLElement>("[data-twikoo-comment='true']"));
  if (!containers.length) {
    return;
  }

  for (const [index, container] of containers.entries()) {
    if (container.dataset.twikooInited === "true") {
      continue;
    }

    const options = buildTwikooOptions(container, index);
    if (!options) {
      container.dataset.twikooInited = "error";
      continue;
    }

    try {
      const twikoo = await getTwikooInstance(container);
      await twikoo.init(options);
      container.dataset.twikooInited = "true";
    } catch (error) {
      container.dataset.twikooInited = "error";
      console.error("Twikoo 初始化失败:", error);
    }
  }
};
