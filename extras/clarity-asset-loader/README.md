# Clarity Asset Loader

A small Halo 2.27.1 companion plugin for the customized Clarity theme. It turns
six globally injected CSS/JS references into inert HTML templates. A small
inline loader requests them only when their associated content exists in the
page, including content inserted after navigation or infinite scrolling.

| Feature | Tested plugin version | Trigger |
| --- | --- | --- |
| Steam cards | steam 1.0.0 | `steam-game-card` |
| Code highlighting | shiki 1.5.1 | `shiki-code` and its two variants |
| Link cards | editor-hyperlink-card 1.9.2 | `hyperlink-card`, `hyperlink-inline-card` |
| Article summaries and reading view | summaraidGPT 4.0.7 | Summary/reading placeholders and components |

Search, comments, Lottie emotes, statistics/heatmap, content widgets, theme assets,
the existing sorting customization, and preconnect settings keep their existing
loading behavior. Shiki's independent plain-code renderer on moments/docs pages
also remains intact. No third-party plugin JAR is modified.

## Compatibility

The processor runs at the lowest Spring order, with optional dependencies on
the four source plugins to place it after their injectors. It modifies only
literal plugin snippets, not the surrounding Thymeleaf model. Recognition is
limited to exact tested asset paths and versions. Unknown versions retain their
normal eager loading until reviewed. Plugin startup and the final rendered HTML
must be checked after deployment or an upgrade; an ordering change can make an
asset eager again.

The loader preserves original script attributes (including module type), observes
DOM additions, deduplicates URL requests, and retries failed resources twice.
It does not emit synthetic DOMContentLoaded events. ArticleSummary handles an
already-loaded DOM; the other selected scripts register custom elements, which
upgrade existing content automatically.

This plugin acts on Halo theme head injection, and is not restricted to one
theme name. Disable it when switching to an untested theme or plugin version.

## Build and Test

`src/main/resources/plugin.yaml` is the installation manifest. The compiled
`dist/clarity-asset-loader-1.0.0.jar` is the deployed artifact. Build with Java 21
and Halo 2.27.1's API, Thymeleaf, Spring, Reactor, PF4J, reactive-streams and jsoup
dependencies on the compiler classpath. No dependencies are bundled in the JAR.

`build.py` is an environment-specific ECJ build helper: it expects Docker, the
Halo container named in the script, and ECJ 3.39.0 saved as `ecj.jar` beside it.
It compiles in a new temporary container directory each run. The compiler is
available at `https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.39.0/`.

For the DOM loader tests, run `pnpm install --ignore-scripts`, then
`node --test test/loader.test.cjs`. Tests use a synthetic DOM and do not fetch
any real site assets. `test/RewriteTest.java` tests the server transformer with
the pre-change homepage HTML supplied as its first argument.

## Measured Result (2026-11-10)

The homepage's directly referenced CSS/JS count changed from 31 to 25, including
one external font stylesheet in both counts. Same-origin CSS/JS changed from
30 to 24 and from 1,872,257 to 1,647,738 bytes uncompressed. The six selected
resources total 224,519 bytes (11.99% of the same-origin baseline); the inline
loader adds 3,115 bytes to HTML. Images, font binaries, transferred compression,
and later dynamic requests are excluded from this comparison.

Server checks covered homepage, updated sorting, an article, moments and photos;
all original theme files and plugin JARs were hash-checked as unchanged. This is
an asset/markup verification, not a measured browser LCP or a full interaction
test in a real browser.

## Install and Roll Back

Use Halo's plugin console to install and enable the JAR. To roll back, disable
`Clarity Asset Loader` in the console. The next rendered page uses the original
plugin asset injection again. The existing theme and original plugins do not
need to be restored. Purge any HTML cache after changing the enabled state.

Production deployment evidence and private backups are stored on the server;
credentials, database settings and configuration backups are not part of this
repository.
