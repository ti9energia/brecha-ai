import { describe, it, expect } from "vitest";
import { authenticate, userById } from "./users";

// Os 3 perfis de produto (accountType) vêm do USUÁRIO no servidor — fonte da verdade,
// não do cliente. Senha demo pública: "demo1234".
describe("perfis de produto (accountType)", () => {
  it("cada conta-demo recebe o perfil certo ao autenticar", async () => {
    expect((await authenticate("marina.alves@acme.com.br", "demo1234"))?.accountType).toBe("company");
    expect((await authenticate("dra.silva@silvaadvogados.com.br", "demo1234"))?.accountType).toBe("firm");
    expect((await authenticate("owner@brecha.ai", "demo1234"))?.accountType).toBe("owner");
  });

  it("userById também devolve o perfil (usado p/ restaurar sessão / WhatsApp)", () => {
    expect(userById("u-silva")?.accountType).toBe("firm");
    expect(userById("u-marina")?.accountType).toBe("company");
  });

  it("credencial inválida → null", async () => {
    expect(await authenticate("dra.silva@silvaadvogados.com.br", "errada")).toBeNull();
    expect(await authenticate("inexistente@x.com", "demo1234")).toBeNull();
  });
});
