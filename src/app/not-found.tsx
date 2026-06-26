import Link from "next/link";
import { Mark } from "@/ui/Logo";

// 404 global (rotas fora de /[locale], raras). Self-contained: provê o próprio
// html/body, pois o root layout é passthrough.
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body className="grain min-h-dvh antialiased">
        <main className="relative min-h-dvh grid place-items-center overflow-hidden px-6 bg-canvas text-ink">
          <div className="aurora opacity-40" />
          <div className="relative text-center max-w-md">
            <Mark size={52} className="mx-auto mb-7" />
            <p className="mono text-sm tracking-[0.3em] text-brand">404</p>
            <h1 className="mt-3 font-display font-bold text-3xl text-ink">Janela não encontrada</h1>
            <p className="mt-4 text-ink-3">Esta rota não existe ou a janela já fechou.</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-12 px-6 mt-8 rounded-[var(--radius-md)] bg-brand text-on-brand font-medium hover:brightness-110 transition"
            >
              Voltar ao início
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
