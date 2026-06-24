// Isomorphic translation helpers (no client/server boundary).

export type Dict = Record<string, unknown>;
export type Vars = Record<string, string | number>;

export function getPath(obj: Dict, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Dict)) {
      return (acc as Dict)[key];
    }
    return undefined;
  }, obj);
}

// Minimal ICU-style interpolation: "Olá {name}" + { name } → "Olá Ana".
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export type Translator = (key: string, vars?: Vars) => string;

export function createTranslator(messages: Dict, namespace?: string): Translator {
  return (key: string, vars?: Vars) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const value = getPath(messages, fullKey);
    if (typeof value === "string") return interpolate(value, vars);
    // Never show raw keys to users: return the leaf token as a soft fallback.
    return fullKey.split(".").pop() ?? fullKey;
  };
}

// Deep-merge plain objects (later sources win). Used to apply the fallback chain.
export function deepMerge<T extends Dict>(...sources: Dict[]): T {
  const out: Dict = {};
  for (const src of sources) {
    if (!src) continue;
    for (const [key, value] of Object.entries(src)) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        out[key] &&
        typeof out[key] === "object"
      ) {
        out[key] = deepMerge(out[key] as Dict, value as Dict);
      } else {
        out[key] = value;
      }
    }
  }
  return out as T;
}
