import { describe, it, expect } from "vitest";
import { domainBrain } from "./brain";

describe("domainBrain", () => {
  it("answers savings questions with R$ and a savings action", () => {
    const reply = domainBrain("quanto economizamos?", "pt-BR");
    expect(typeof reply.text).toBe("string");
    expect(reply.text.length).toBeGreaterThan(0);
    expect(reply.text).toContain("R$");
    expect(reply.actions.some((a) => a.module === "savings")).toBe(true);
    expect(reply.model).toBe("Cérebro local");
  });

  it("answers highest-gain questions with an opportunity action carrying an id", () => {
    const reply = domainBrain("qual a jogada de maior ganho?", "pt-BR");
    const opp = reply.actions.find((a) => a.module === "opportunity");
    expect(opp).toBeDefined();
    expect(opp!.params?.id).toBeTruthy();
    expect(reply.model).toBe("Cérebro local");
  });

  it("answers closing-window questions with urgency and sources", () => {
    const reply = domainBrain("quais janelas estão fechando?", "pt-BR");
    // pt-BR text mentions days ("dias") for the most urgent window.
    expect(reply.text).toContain("dias");
    expect(reply.sources.length).toBeGreaterThan(0);
  });

  it("greets in English when locale is en (differs from the pt-BR greeting)", () => {
    const en = domainBrain("hello", "en");
    const pt = domainBrain("hello", "pt-BR");
    expect(en.text).not.toBe(pt.text);
    // English greeting introduces the copilot by name.
    expect(en.text).toContain("Vega");
    expect(en.text).toContain("I'm Vega");
  });
});
