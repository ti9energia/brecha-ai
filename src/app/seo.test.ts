import { describe, it, expect } from "vitest";
import { GET as llms } from "./llms.txt/route";
import robots from "./robots";

describe("SEO / AEO / GEO", () => {
  it("/llms.txt serve markdown com o overview do produto", async () => {
    const res = llms();
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const body = await res.text();
    expect(body).toContain("# Brecha.ai");
    expect(body.toLowerCase()).toContain("success fee");
    expect(body).toContain("## Conceitos-chave");
  });

  it("robots permite crawlers de IA (GEO) e aponta o sitemap", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const agents = rules.flatMap((x) => (Array.isArray(x.userAgent) ? x.userAgent : [x.userAgent]));
    expect(agents).toContain("GPTBot");
    expect(agents).toContain("ClaudeBot");
    expect(agents).toContain("PerplexityBot");
    expect(String(r.sitemap)).toContain("/sitemap.xml");
  });
});
