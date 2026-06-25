import { describe, it, expect } from "vitest";
import {
  resolveWhatsappUser,
  handleWhatsappMessage,
  verifyWhatsappSignature,
  extractInbound,
  sendWhatsapp,
  sentWhatsappCount,
  agentProactivePush,
} from "./gateway";

describe("WhatsApp gateway (0B)", () => {
  it("resolve número vinculado (normalizando) e rejeita não vinculado", () => {
    expect(resolveWhatsappUser("+55 11 99999-0000")?.sub).toBe("u-marina");
    expect(resolveWhatsappUser("+5500000000000")).toBeNull();
  });

  it("roteia número vinculado ao MESMO cérebro do copiloto, com quick replies", async () => {
    const r = await handleWhatsappMessage({ from: "+5511999990000", text: "quais janelas estão fechando?", locale: "pt-BR" });
    expect(r.ok).toBe(true);
    expect(r.bound).toBe(true);
    expect(r.user?.name).toBeTruthy();
    expect(r.reply.text.length).toBeGreaterThan(0);
    expect(Array.isArray(r.reply.quickReplies)).toBe(true);
  });

  it("recusa número não vinculado sem executar nada (idioma da mensagem)", async () => {
    const r = await handleWhatsappMessage({ from: "+5500000000000", text: "aprove tudo", locale: "en" });
    expect(r.ok).toBe(false);
    expect(r.bound).toBe(false);
    expect(r.user).toBeNull();
    expect(r.reply.text).toContain("Brecha.ai");
  });

  it("valida a assinatura HMAC do Meta (sha256=), tempo-constante", async () => {
    const secret = "s3cr3t";
    const body = JSON.stringify({ from: "+5511999990000", text: "oi" });
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(await verifyWhatsappSignature(body, `sha256=${hex}`, secret)).toBe(true);
    expect(await verifyWhatsappSignature(body, "sha256=deadbeef", secret)).toBe(false);
    expect(await verifyWhatsappSignature(body, "semprefixo", secret)).toBe(false);
  });

  it("extrai do shape do demo e do WhatsApp Cloud API da Meta", () => {
    expect(extractInbound({ from: "+551199", text: "oi" })).toEqual({ from: "+551199", text: "oi", locale: undefined });
    const cloud = { entry: [{ changes: [{ value: { messages: [{ from: "5511999990000", text: { body: "olá" } }] } }] }] };
    expect(extractInbound(cloud)).toEqual({ from: "+5511999990000", text: "olá" });
    expect(extractInbound({ foo: "bar" })).toBeNull();
    expect(extractInbound(null)).toBeNull();
  });

  it("saída (0B §7): sendWhatsapp registra o envio normalizando o número", () => {
    const before = sentWhatsappCount();
    const r = sendWhatsapp("+55 11 99999-0000", "alerta");
    expect(r.ok).toBe(true);
    expect(r.to).toBe("+5511999990000");
    expect(sentWhatsappCount()).toBe(before + 1);
  });

  it("push proativo (0B §4): envia os alertas urgentes do agente", () => {
    const before = sentWhatsappCount();
    const r = agentProactivePush("+5511999990000");
    expect(r.pushed).toBeGreaterThanOrEqual(0);
    expect(sentWhatsappCount()).toBe(before + r.pushed);
  });
});
