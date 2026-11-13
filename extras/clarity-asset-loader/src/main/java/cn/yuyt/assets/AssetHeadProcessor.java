package cn.yuyt.assets;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.ITemplateContext;
import org.thymeleaf.processor.element.IElementModelStructureHandler;
import org.thymeleaf.model.IModel;
import org.thymeleaf.model.IText;
import reactor.core.publisher.Mono;
import run.halo.app.theme.dialect.TemplateHeadProcessor;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class AssetHeadProcessor implements TemplateHeadProcessor {
    private static final Map<String, String> ASSETS = Map.ofEntries(
        Map.entry("/plugins/steam/assets/static/steam-game-card.js?v=1.0.0", "steam"),
        Map.entry("/plugins/steam/assets/static/steam-game-card.css?v=1.0.0", "steam"),
        Map.entry("/plugins/shiki/assets/static/shiki-code.js?version=1.5.1", "shiki"),
        Map.entry("/plugins/editor-hyperlink-card/assets/static/index.iife.js?version=1.9.2", "hyperlink"),
        Map.entry("/plugins/editor-hyperlink-card/assets/static/index.css?version=1.9.2", "hyperlink"),
        Map.entry("/plugins/summaraidGPT/assets/static/ArticleSummary.js?version=4.0.7", "summary"),
        Map.entry("/plugins/data-statistics/assets/static/min/chart.umd.min.js?version=1.0.5", "statistics"),
        Map.entry("/plugins/data-statistics/assets/static/min/siteCharts.min.css?version=1.0.5", "statistics"),
        Map.entry("/plugins/data-statistics/assets/static/min/siteCharts.min.js?version=1.0.5", "statistics"),
        Map.entry("/plugins/data-statistics/assets/static/min/dataStatistics.min.js?version=1.0.5", "statistics"),
        Map.entry("/plugins/data-statistics/assets/static/min/dataStatistics.min.css?version=1.0.5", "statistics")
    );
    private final String loader;

    public AssetHeadProcessor() throws IOException {
        try (var input = getClass().getResourceAsStream("/asset-loader.js")) {
            if (input == null) throw new IOException("Missing asset-loader.js");
            loader = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    // Rewrite only literal plugin snippets, leaving Thymeleaf's own model intact.
    static String rewrite(String html) {
        if (ASSETS.keySet().stream().noneMatch(html::contains)) return html;
        var doc = Jsoup.parseBodyFragment(html);
        doc.outputSettings().prettyPrint(false);
        boolean changed = false;
        for (var element : doc.select("script[src], link[rel=stylesheet][href]")) {
            var feature = ASSETS.get(element.attr(element.normalName().equals("script") ? "src" : "href"));
            if (feature == null || element.parent().normalName().equals("template")) continue;
            var template = new Element("template").attr("data-clarity-feature", feature);
            element.replaceWith(template);
            template.appendChild(element);
            changed = true;
        }
        return changed ? doc.body().html() : html;
    }

    @Override
    public Mono<Void> process(ITemplateContext context, IModel model,
            IElementModelStructureHandler structureHandler) {
        boolean changed = false;
        var factory = context.getModelFactory();
        for (int i = 0; i < model.size(); i++) {
            if (model.get(i) instanceof IText text) {
                var original = text.getText();
                var result = rewrite(original);
                if (!result.equals(original)) {
                    model.replace(i, factory.createText(result));
                    changed = true;
                }
            }
        }
        if (changed) model.add(factory.createText("<script data-clarity-asset-loader>" + loader + "</script>"));
        return Mono.empty();
    }
}
