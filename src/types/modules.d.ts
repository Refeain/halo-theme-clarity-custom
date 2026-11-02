declare module "@alpinejs/collapse" {
  import type { PluginCallback } from "alpinejs";
  const collapse: PluginCallback;
  export default collapse;
}

declare module "twikoo" {
  export interface TwikooInitOptions {
    envId: string;
    el: string;
    path?: string;
    region?: string;
    lang?: string;
    accessToken?: string;
    [key: string]: unknown;
  }

  export function init(options: TwikooInitOptions): void | Promise<void>;
}
