import { describe, it, expect } from "vitest";
import { aiChat } from "./index";
import { localProvider, anthropicProvider, resolveProvider } from "./provider";

describe("AI Core — camada de modelo (0A §2.1)", () => {
  it("localProvider sempre disponível e não refina (usa o texto do domínio)", async () => {
    expect(localProvider.available()).toBe(true);
    expect(await localProvider.refine([{ role: "user", content: "x" }], "pt-BR")).toBeNull();
  });

  it("anthropicProvider só disponível com a chave; resolveProvider escolhe um válido", () => {
    expect(anthropicProvider.available()).toBe(!!process.env.ANTHROPIC_API_KEY);
    expect(["anthropic", "local"]).toContain(resolveProvider().id);
  });

  it("aiChat (forçando local) devolve grounding: texto + ações + fontes do domínio", async () => {
    const r = await aiChat([{ role: "user", content: "qual a jogada de maior ganho?" }], "pt-BR", localProvider);
    expect(r.text.length).toBeGreaterThan(0);
    expect(r.actions.length).toBeGreaterThan(0);
    expect(r.model).toBe("Cérebro local");
  });
});
