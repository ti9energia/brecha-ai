// ─────────────────────────────────────────────────────────────────────────────
// Testes de primitivos de UI (funções puras; sem DOM / renderização JSX).
// Ambiente Vitest node — usa importações estáticas para garantir a cobertura
// de exports sem depender de jsdom.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";

import {
  buttonClass,
  Table, Field, Input, SelectInput, Switch, RadioGroup,
  TabList, TabPanel, Skeleton, Stat, Chip, Meter, EmptyState, Dot, Card, Eyebrow,
} from "./primitives";

import { Dialog, Sheet } from "./Dialog";
import { Tooltip } from "./Tooltip";

// ── buttonClass — função pura, testável sem DOM ───────────────────────────────
describe("buttonClass()", () => {
  it("inclui classes base de layout e transição", () => {
    const cls = buttonClass();
    expect(cls).toContain("inline-flex");
    expect(cls).toContain("transition-all");
    expect(cls).toContain("font-medium");
  });

  it("variante 'primary' aplica bg-brand e sombra dourada", () => {
    const cls = buttonClass("primary", "md");
    expect(cls).toContain("bg-brand");
    expect(cls).toContain("text-on-brand");
    expect(cls).toContain("shadow");
  });

  it("variante 'secondary' aplica bg-surface-2 e borda", () => {
    const cls = buttonClass("secondary", "md");
    expect(cls).toContain("bg-surface-2");
    expect(cls).toContain("border-line");
  });

  it("variante 'danger' aplica texto de perigo", () => {
    const cls = buttonClass("danger", "sm");
    expect(cls).toContain("text-danger");
  });

  it("variante 'ghost' não tem background sólido", () => {
    const cls = buttonClass("ghost", "md");
    expect(cls).toContain("text-ink-2");
    expect(cls).not.toContain("bg-brand");
  });

  it("variante 'outline' usa borda dourada", () => {
    const cls = buttonClass("outline", "md");
    expect(cls).toContain("border-line-gold");
    expect(cls).toContain("text-brand");
  });

  it("tamanho 'sm' aplica h-8 e px-3", () => {
    const cls = buttonClass("primary", "sm");
    expect(cls).toContain("h-8");
    expect(cls).toContain("px-3");
  });

  it("tamanho 'lg' aplica h-12 e px-6", () => {
    const cls = buttonClass("primary", "lg");
    expect(cls).toContain("h-12");
    expect(cls).toContain("px-6");
  });

  it("classe extra é mesclada no resultado final", () => {
    const cls = buttonClass("primary", "md", "mt-4 w-full");
    expect(cls).toContain("mt-4");
    expect(cls).toContain("w-full");
  });

  it("padrão: primary md sem extra", () => {
    const cls = buttonClass();
    expect(cls).toContain("bg-brand");
    expect(cls).toContain("h-10");
  });
});

// ── Exportações — todos os novos primitivos existem como função ───────────────
describe("primitives.tsx — exportações Onda 5", () => {
  it("primitivos visuais originais existem", () => {
    expect(typeof Card).toBe("function");
    expect(typeof Eyebrow).toBe("function");
    expect(typeof Chip).toBe("function");
    expect(typeof Meter).toBe("function");
    expect(typeof EmptyState).toBe("function");
    expect(typeof Skeleton).toBe("function");
    expect(typeof Stat).toBe("function");
    expect(typeof Dot).toBe("function");
  });

  it("novos primitivos de formulário existem", () => {
    expect(typeof Field).toBe("function");
    expect(typeof Input).toBe("function");
    expect(typeof SelectInput).toBe("function");
    expect(typeof Switch).toBe("function");
    expect(typeof RadioGroup).toBe("function");
  });

  it("novo primitivo Table existe", () => {
    expect(typeof Table).toBe("function");
  });

  it("novos primitivos de Tabs existem", () => {
    expect(typeof TabList).toBe("function");
    expect(typeof TabPanel).toBe("function");
  });
});

describe("Dialog.tsx — exportações", () => {
  it("exporta Dialog e Sheet como funções", () => {
    expect(typeof Dialog).toBe("function");
    expect(typeof Sheet).toBe("function");
  });
});

describe("Tooltip.tsx — exportação", () => {
  it("exporta Tooltip como função", () => {
    expect(typeof Tooltip).toBe("function");
  });
});
