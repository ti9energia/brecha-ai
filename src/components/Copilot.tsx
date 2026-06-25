"use client";

import {
  createContext, useContext, useState, useRef, useEffect, useCallback,
  type ReactNode, type KeyboardEvent,
} from "react";
import { Send, X, Sparkles, ArrowUpRight, ExternalLink, Cpu } from "lucide-react";
import { useTranslations, useLocale } from "@/i18n/provider";
import { useWorkspace, type ModuleId } from "@/workspace/store";
import { useFocusTrap } from "@/ui/useFocusTrap";
import { Mark } from "@/ui/Logo";
import { cn } from "@/ui/cn";

interface Action { label: string; module: string; params?: Record<string, string> }
interface Source { ref: string; url?: string }
interface Msg { role: "user" | "assistant"; content: string; sources?: Source[]; actions?: Action[]; model?: string }

interface CopilotApi {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  ask: (prompt: string) => void;
  messages: Msg[];
}
const Ctx = createContext<CopilotApi | null>(null);
export function useCopilot() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCopilot within CopilotProvider");
  return c;
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const pending = useRef<string | null>(null);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const json = await res.json();
      const r = json.data;
      setMessages((m) => [...m, { role: "assistant", content: r.text, sources: r.sources, actions: r.actions, model: r.model }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "—" }]);
    } finally {
      setSending(false);
    }
  }, [messages, sending, locale]);

  const ask = useCallback((prompt: string) => {
    setOpen(true);
    pending.current = prompt;
  }, []);

  // dispara o prompt pendente quando o painel abre
  useEffect(() => {
    if (open && pending.current) {
      const p = pending.current;
      pending.current = null;
      send(p);
    }
  }, [open, send]);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <Ctx.Provider value={{ open, setOpen, toggle, ask, messages }}>
      {children}
      <CopilotPanel open={open} setOpen={setOpen} messages={messages} sending={sending} onSend={send} />
    </Ctx.Provider>
  );
}

function CopilotPanel({
  open, setOpen, messages, sending, onSend,
}: {
  open: boolean; setOpen: (v: boolean) => void; messages: Msg[]; sending: boolean; onSend: (t: string) => void;
}) {
  const t = useTranslations("copilot");
  const ws = useWorkspace();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, open);
  const lastModel = [...messages].reverse().find((m) => m.model)?.model;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function submit() {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const suggestions = [t("s1"), t("s2"), t("s3"), t("s4")];

  return (
    <>
      {/* backdrop (mobile) */}
      <div
        className={cn("fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm lg:hidden transition-opacity", open ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={() => setOpen(false)}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        inert={!open}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-[81] w-full sm:w-[400px] flex flex-col glass border-l border-line shadow-[var(--shadow-lg)] transition-transform duration-400 ease-[var(--ease-out-expo)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-4 h-16 border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <span className="relative grid place-items-center size-9 rounded-full bg-surface-3 border border-line-gold">
              <Mark size={20} />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-positive border-2 border-[color:var(--surface)]" />
            </span>
            <div>
              <p className="font-display font-semibold text-ink leading-tight">{t("title")}</p>
              <p className="mono text-[0.66rem] text-ink-4">{t("subtitle")}</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="grid place-items-center size-8 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink hover:bg-surface-3 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="animate-rise">
              <div className="flex gap-2.5">
                <Avatar />
                <div className="flex-1 rounded-[var(--radius-md)] rounded-tl-sm bg-surface-2 border border-line p-3.5 text-sm text-ink-2 text-pretty">
                  {t("greeting")}
                </div>
              </div>
              <p className="eyebrow mt-6 mb-2.5">{t("suggestionsTitle")}</p>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSend(s)}
                    className="w-full text-left text-sm text-ink-2 rounded-[var(--radius-md)] border border-line bg-surface-2 hover:border-line-gold hover:text-ink px-3.5 py-2.5 transition-colors flex items-center gap-2 group"
                  >
                    <Sparkles size={14} className="text-brand shrink-0" />
                    <span className="flex-1">{s}</span>
                    <ArrowUpRight size={14} className="text-ink-4 group-hover:text-brand transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-[var(--radius-md)] rounded-tr-sm bg-surface-4 px-3.5 py-2.5 text-sm text-ink">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <Avatar />
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="rounded-[var(--radius-md)] rounded-tl-sm bg-surface-2 border border-line p-3.5 text-sm text-ink-2">
                    <RichText text={m.content} />
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.sources.map((s, j) => (
                        <a key={j} href={s.url} target="_blank" rel="noreferrer" className="chip text-[0.66rem] hover:border-line-gold transition-colors">
                          <ExternalLink size={10} /> {s.ref}
                        </a>
                      ))}
                    </div>
                  )}
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {m.actions.map((a, j) => (
                        <button
                          key={j}
                          onClick={() => { ws.open(a.module as ModuleId, a.params); if (window.innerWidth < 1024) setOpen(false); }}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] border border-line-gold bg-[var(--brand-soft)] text-brand text-xs hover:brightness-110 transition"
                        >
                          {a.label} <ArrowUpRight size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {sending && (
            <div className="flex gap-2.5">
              <Avatar />
              <div className="rounded-[var(--radius-md)] rounded-tl-sm bg-surface-2 border border-line px-4 py-3 flex items-center gap-1.5">
                <Dot3 />
              </div>
            </div>
          )}
        </div>

        {/* input */}
        <div className="border-t border-line p-3 shrink-0">
          <div className="relative flex items-end gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 focus-within:border-line-gold transition-colors p-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder={t("placeholder")}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-ink placeholder:text-ink-4 max-h-28 px-1.5 py-1"
            />
            <button
              onClick={submit}
              disabled={!draft.trim() || sending}
              className="grid place-items-center size-8 rounded-[var(--radius-sm)] bg-brand text-on-brand disabled:opacity-40 hover:brightness-110 transition shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 mono text-[0.62rem] text-ink-4">
            <Cpu size={10} /> {lastModel ?? t("localBrain")}
          </p>
        </div>
      </aside>
    </>
  );
}

function Avatar() {
  return (
    <span className="grid place-items-center size-7 rounded-full bg-surface-3 border border-line-gold shrink-0 mt-0.5">
      <Mark size={15} />
    </span>
  );
}

function Dot3() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 rounded-full bg-ink-4 animate-[count-blink_1.2s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

// Renderizador leve: **negrito**, quebras de linha e itens "1. " / "- ".
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="text-ink font-semibold">{p.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{p}</span>
          ),
        );
        return <p key={i}>{parts}</p>;
      })}
    </div>
  );
}
