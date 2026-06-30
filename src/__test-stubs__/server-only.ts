// Stub de "server-only" para testes Vitest.
// O pacote real só existe no runtime Next.js (app router) e lança um erro se
// importado no cliente. Em testes (Node puro / Vitest) não há bundle split,
// então substituímos por um módulo vazio para não quebrar as suites.
export {};
