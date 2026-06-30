// Skeleton do workspace — exibido pelo Next.js enquanto a page.tsx carrega.
// Usa Server Component (sem "use client") para hidratação zero-overhead.
import { Skeleton } from "@/ui/primitives";

export default function AppLoading() {
  return (
    <div className="h-dvh flex bg-canvas overflow-hidden" aria-hidden="true">
      {/* NavRail skeleton — desktop only */}
      <div className="hidden md:flex w-[3.75rem] shrink-0 flex-col items-center gap-2 border-r border-line bg-[var(--canvas-deep)] py-3 px-2">
        <Skeleton className="size-10" />
        <div className="mt-3 flex flex-col gap-2 items-center w-full">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="size-9" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      </div>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar skeleton */}
        <div className="h-12 shrink-0 border-b border-line flex items-center px-4 gap-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="ml-auto h-5 w-24" />
          <Skeleton className="size-8 rounded-full" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 overflow-hidden p-5 md:p-7">
          <div className="max-w-3xl space-y-4">
            <Skeleton className="h-7 w-52" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" style={{ animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
            <Skeleton className="h-44" style={{ animationDelay: "0.1s" }} />
            <Skeleton className="h-72" style={{ animationDelay: "0.15s" }} />
          </div>
        </div>

        {/* StatusBar skeleton */}
        <div className="h-8 shrink-0 border-t border-line flex items-center px-4 gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
