import type { ReactNode } from "react";
import "./globals.css";

// Root pass-through: o <html>/<body> reais vivem em app/[locale]/layout.tsx,
// onde o `locale` está disponível para definir lang/dir e as fontes.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
