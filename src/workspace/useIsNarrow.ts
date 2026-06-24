"use client";

import { useEffect, useState } from "react";

// true quando a viewport é estreita (< lg). Usado para colapsar o split em 1
// painel no mobile. SSR assume desktop (false) e ajusta no mount.
export function useIsNarrow(breakpoint = 1024): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setNarrow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);
  return narrow;
}
