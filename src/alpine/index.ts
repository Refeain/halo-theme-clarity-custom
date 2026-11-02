import type Alpine from "alpinejs";
import { registerThemeToggle } from "./themeToggle";
import { registerUserAuth } from "./userAuth";
import { registerSidebarControl } from "./sidebarControl";
import { registerPostLike } from "./postLike";
import { registerPagination } from "./pagination";
import { registerMusicPlayer } from "./musicPlayer";

export function registerAlpineComponents(alpine: typeof Alpine) {
  registerThemeToggle(alpine);
  registerUserAuth(alpine);
  registerSidebarControl(alpine);
  registerPostLike(alpine);
  registerPagination(alpine);
  registerMusicPlayer(alpine);
}
