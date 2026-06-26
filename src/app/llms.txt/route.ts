// /llms.txt (padrão llmstxt.org) — overview conciso do site para crawlers de LLM
// (AEO/GEO). Markdown estável; o conteúdo profundo fica em /llms-full.txt.
export const dynamic = "force-static";

export function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://brecha.ai";
  const body = `# Brecha.ai

> GPS de oportunidade regulatória (AI SaaS). Monitora cada mudança normativa (federal, estadual, municipal), simula o impacto na estrutura fiscal/jurídica de cada cliente e recomenda — e executa, com aprovação humana — a reorganização ótima (regime, enquadramento, jurisdição) antes da janela regulatória fechar. Cobra success fee sobre a economia capturada.

Brecha.ai cruza diários oficiais com a estrutura do cliente, abre "janelas" (oportunidades) ranqueadas por ganho potencial, simula o antes/depois num motor fiscal determinístico, e leva da norma à jogada protocolada com trilha de auditoria imutável. Copiloto Vega em toda tela (4 idiomas), agente autônomo de decisão e controle por WhatsApp.

## Produto
- [Visão geral e como funciona](${base}/pt-BR): radar normativo → relevância → oportunidade → simulação → execução → economia capturada.
- [Planos](${base}/pt-BR#pricing): Radar, Estrutura e Execução — assinatura mensal + success fee sobre a economia conciliada.
- [Entrar / demonstração](${base}/pt-BR/login)
- [Aviso legal e privacidade](${base}/pt-BR/legal)

## Conceitos-chave
- Janela regulatória: período em que uma mudança normativa permite uma reorganização vantajosa; fecha por prazo legal — o valor está em agir antes do fechamento.
- Jogada (recommended move): a reorganização recomendada (regime/enquadramento/jurisdição) para capturar a oportunidade, validada por simulação determinística e aprovação do tributarista.
- Success fee: cobrança sobre a economia REALIZADA e conciliada — alinhamento de incentivo (só ganha se o cliente ganhar).

## Para quem
CFO/controller, tributarista/jurídico e donos de empresa em setores regulados (indústria, agro, tecnologia, energia, varejo, logística, saúde, finanças, construção).

## Idiomas
pt-BR (padrão), en, zh-CN, fr-FR. Textos normativos preservados no idioma original; explicações da IA no idioma do usuário.

## Privacidade & governança
Textos normativos são públicos; a estrutura de cada cliente é isolada por tenant; a IA opera dentro das permissões do papel (RBAC) e do plano (entitlements); toda ação da IA é auditada.
`;
  return new Response(body, {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
