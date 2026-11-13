package cn.yuyt.assets;

import java.nio.file.Files;
import java.nio.file.Path;
import org.jsoup.Jsoup;

public class RewriteTest {
    public static void main(String[] args) throws Exception {
        String html = Files.readString(Path.of(args[0]));
        String rewritten = AssetHeadProcessor.rewrite(html);
        var doc = Jsoup.parse(rewritten);
        if (doc.select("template[data-clarity-feature]").size() != 11) throw new AssertionError("Expected eleven inert resources");
        if (!AssetHeadProcessor.rewrite(rewritten).equals(rewritten)) throw new AssertionError("Not idempotent");
        for (var el : doc.select("script[src],link[href]")) {
            if (el.attr("src").contains("steam-game-card") && !el.parent().normalName().equals("template")) {
                throw new AssertionError("Active Steam asset");
            }
        }
        String unknown = "<script src='/plugins/shiki/assets/static/shiki-code.js?version=1.5.2'></script>";
        if (!AssetHeadProcessor.rewrite(unknown).equals(unknown)) throw new AssertionError("Unknown versions must stay eager");
        String untouched = "<th:block th:replace='layout'></th:block><script>let text = '<test>';</script>";
        if (!AssetHeadProcessor.rewrite(untouched).equals(untouched)) throw new AssertionError("Unrelated model changed");
        System.out.println("PASS: rewrite, eleven inert assets, idempotence, version fallback, unchanged model");
    }
}
