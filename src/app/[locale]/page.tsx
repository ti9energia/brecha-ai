import Link from "next/link";
import {
  ArrowRight, Play, Radar, FlaskConical, ShieldCheck, Sparkles,
  TrendingDown, Clock, CircleSlash, Check, Quote,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroInstrument, type HeroOpp } from "@/components/HeroInstrument";
import { Marquee } from "@/components/Marquee";
import { Faq } from "@/components/Faq";
import { OpportunityCard } from "@/components/OpportunityCard";
import { Reveal } from "@/ui/Reveal";
import { CountUp, LiveTicker } from "@/ui/CountUp";
import { Mark } from "@/ui/Logo";
import { SectorIcon } from "@/ui/SectorIcon";
import { Eyebrow, Chip, buttonClass } from "@/ui/primitives";
import { getT, getFmt } from "@/i18n/server";
import { resolveLocale } from "@/i18n/config";
import { listOpportunities, opportunitiesSummary, getSectors, getPlans, ownerKpis } from "@/server/domain/store";

const SOURCES = ["Diário Oficial da União", "CONFAZ", "Receita Federal", "PGFN", "SEF/SC", "SEFAZ/SP", "STJ", "MCTI", "SUDENE", "JUCESP"];

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = getT(locale, "landing");
  const tc = getT(locale, "common");
  const fmt = getFmt(locale);

  const summary = opportunitiesSummary();
  const kpis = ownerKpis();
  const opps = listOpportunities({ sort: "gain" });
  const heroOpps: HeroOpp[] = listOpportunities({ sort: "deadline" })
    .slice(0, 5)
    .map((o) => ({ id: o.id, title: o.title, estimatedGain: o.estimatedGain, daysRemaining: o.daysRemaining, sector: o.sector }));
  const sectors = getSectors();
  const plans = getPlans();

  const faqItems = [
    { q: "Como vocês detectam uma oportunidade antes de mim?", a: "O radar ingere continuamente normas federais, estaduais e municipais de 1.247 fontes oficiais. Cada mudança é vetorizada e cruzada com o perfil fiscal e jurídico da sua estrutura. Quando há relevância e ganho, a janela abre — com prazo, esforço e confiança calculados." },
    { q: "Os números da simulação são confiáveis?", a: "A jogada é explicada pela IA, mas validada por um motor fiscal/jurídico determinístico: o cálculo do antes e depois não é estimativa de linguagem, é regra tributária aplicada à sua base. Você vê as premissas de cada cenário." },
    { q: "Vocês executam sozinhos? E se der errado?", a: "Nunca. Toda jogada irreversível passa pela aprovação do seu tributarista. A execução é um checklist auditado de documentos, prazos e responsáveis. Tudo é registrado em trilha imutável e, quando aplicável, reversível." },
    { q: "Como funciona o success fee?", a: "Você paga uma assinatura enxuta pelo radar e pela simulação. O grosso é success fee: um percentual da economia que de fato entrou na sua conta e foi conciliada. Sem captura, sem fee — nosso ganho está alinhado ao seu." },
    { q: "Meus dados ficam seguros?", a: "Isolamento multi-tenant rígido, criptografia em trânsito e repouso, e conformidade com LGPD. Os textos normativos são públicos; a sua estrutura é sua, e a IA opera dentro das permissões do seu papel." },
  ];

  const sectionNo = (n: string) => <span className="mono text-brand/70 text-xs mr-3">{n}</span>;

  return (
    <div className="relative overflow-clip">
      <SiteHeader />

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative pt-32 sm:pt-40 pb-16">
        <div className="aurora" />
        <div className="radar-sweep opacity-60" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-50 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-8 items-center">
          <div>
            <Reveal>
              <Link href="#how" className="inline-flex items-center gap-2 rounded-full border border-line-gold bg-[var(--brand-soft)] pl-1.5 pr-3 py-1.5 text-xs text-brand hover:brightness-110 transition">
                <span className="rounded-full bg-brand text-on-brand px-2 py-0.5 font-semibold text-[0.65rem]">{tc("new")}</span>
                {t("announce")}
                <ArrowRight size={13} />
              </Link>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 display-1 font-bold text-ink text-balance">
                {t("heroTitleA")}{" "}
                <span className="gold-foil gold-foil-shimmer">{t("heroTitleB")}</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg text-ink-2 text-pretty leading-relaxed">{t("heroSub")}</p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href={`/${locale}/login`} className={buttonClass("primary", "lg", "group")}>
                  {t("heroCta")}
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="#how" className={buttonClass("secondary", "lg", "group")}>
                  <Play size={15} className="text-brand" />
                  {t("heroCtaSecondary")}
                </Link>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <p className="mt-5 mono text-xs text-ink-4">{t("heroNote")}</p>
            </Reveal>

            {/* prova social — números reais no topo (não chavão) */}
            <Reveal delay={380}>
              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                {[
                  { v: fmt.moneyCompact(kpis.capturedNet), l: t("proofA") },
                  { v: fmt.number(kpis.activeTenants), l: t("proofB") },
                  { v: "1.247", l: t("proofC") },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-7">
                    {i > 0 && <span className="h-8 w-px bg-[color:var(--border)] -ml-7 hidden sm:block" />}
                    <div>
                      <p className="font-display font-bold text-xl text-ink tnum leading-none">{m.v}</p>
                      <p className="mt-1 text-[0.72rem] text-ink-4 max-w-[8.5rem] leading-tight">{m.l}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="lg:pl-4">
            <HeroInstrument opps={heroOpps} sources={1247} />
          </Reveal>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 mt-16">
          <p className="text-center eyebrow mb-5">{t("trustLine")}</p>
          <Marquee items={SOURCES} />
        </div>
      </section>

      {/* ──────────────── TICKER: dinheiro na mesa ──────────────── */}
      <section className="relative py-14 border-y border-line bg-[var(--canvas-deep)] overflow-hidden">
        <div className="radar-sweep opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <Eyebrow className="justify-center">{t("tickerLabel")}</Eyebrow>
          <p className="mt-4 font-display font-bold tnum text-[clamp(2.4rem,7vw,5.5rem)] leading-none text-ink">
            <LiveTicker base={4_812_400_000} perSecond={2870} kind="money" className="gold-foil" />
          </p>
          <p className="mt-4 text-sm text-ink-3 max-w-md mx-auto text-pretty">{t("tickerNote")}</p>
        </div>
      </section>

      {/* ──────────────────────── STATS ──────────────────────── */}
      <section className="relative py-16">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden border border-line">
          {[
            { v: <CountUp value={1247} kind="integer" />, l: t("statSources") },
            { v: <CountUp value={0.91} kind="percent" />, l: t("statCapture") },
            { v: <><CountUp value={312} kind="integer" />min</>, l: t("statSpeed") },
            { v: <CountUp value={1840} kind="integer" />, l: t("statWindows") },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 80} className="bg-surface p-6 sm:p-8">
              <p className="font-display font-bold text-3xl sm:text-4xl text-brand tnum leading-none">{s.v}</p>
              <p className="mt-3 text-sm text-ink-3 text-pretty">{s.l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ──────────────────────── PROBLEMA ──────────────────────── */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <Eyebrow>{sectionNo("01")}{t("problemEyebrow")}</Eyebrow>
            <h2 className="mt-4 display-2 font-bold text-ink max-w-3xl text-balance">{t("problemTitle")}</h2>
            <p className="mt-5 max-w-2xl text-lg text-ink-2 text-pretty">{t("problemBody")}</p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-3 gap-4">
            {[
              { icon: <TrendingDown size={20} />, v: "~34", l: t("problemCardA") },
              { icon: <Clock size={20} />, v: "23 dias", l: t("problemCardB") },
              { icon: <CircleSlash size={20} />, v: "< 9%", l: t("problemCardC") },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 90} className="panel hairline p-6">
                <div className="grid place-items-center size-10 rounded-[var(--radius-md)] border border-line bg-surface-2 text-brand mb-5">{c.icon}</div>
                <p className="font-display font-bold text-3xl text-ink tnum">{c.v}</p>
                <p className="mt-1.5 text-sm text-ink-3">{c.l}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────── COMO FUNCIONA ──────────────────── */}
      <section id="how" className="relative py-20 scroll-mt-24">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-6">
          <Reveal className="text-center max-w-2xl mx-auto">
            <Eyebrow className="justify-center">{sectionNo("02")}{t("howEyebrow")}</Eyebrow>
            <h2 className="mt-4 display-2 font-bold text-ink text-balance">{t("howTitle")}</h2>
            <p className="mt-5 text-lg text-ink-2 text-pretty">{t("howSub")}</p>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-3 gap-5 relative">
            <div className="hidden md:block absolute top-9 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[color:var(--border-gold)] to-transparent" />
            {[
              { icon: <Radar size={22} />, n: "01", title: t("how1Title"), body: t("how1Body") },
              { icon: <FlaskConical size={22} />, n: "02", title: t("how2Title"), body: t("how2Body") },
              { icon: <ShieldCheck size={22} />, n: "03", title: t("how3Title"), body: t("how3Body") },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 120} className="relative panel hairline p-7 text-center md:text-left">
                <div className="relative z-10 mx-auto md:mx-0 grid place-items-center size-[4.5rem] rounded-full bg-surface border border-line-gold text-brand mb-6 shadow-[var(--shadow-gold)]">
                  {s.icon}
                  <span className="absolute -top-1.5 -right-1.5 grid place-items-center size-6 rounded-full bg-brand text-on-brand mono text-[0.62rem] font-bold">{s.n}</span>
                </div>
                <h3 className="font-display font-semibold text-xl text-ink">{s.title}</h3>
                <p className="mt-3 text-ink-3 text-pretty leading-relaxed">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── OPORTUNIDADES AO VIVO ──────────────── */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>{sectionNo("03")}{tc("new")} · {fmt.number(summary.openWindows)} {t("nav.product")}</Eyebrow>
              <h2 className="mt-4 display-2 font-bold text-ink text-balance max-w-2xl">
                Janelas abertas agora — <span className="text-brand">{fmt.moneyCompact(summary.openGain)}</span> em jogo.
              </h2>
            </div>
            <Link href={`/${locale}/login`} className={buttonClass("outline", "md", "group shrink-0")}>
              {tc("viewAll")}<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opps.slice(0, 3).map((opp, i) => (
              <Reveal key={opp.id} delay={i * 90}>
                <OpportunityCard opp={opp} index={i} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── SETORES ──────────────────────── */}
      <section id="sectors" className="relative py-20 scroll-mt-24 border-y border-line bg-[var(--canvas-deep)]">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="max-w-2xl">
            <Eyebrow>{sectionNo("04")}{t("sectorsEyebrow")}</Eyebrow>
            <h2 className="mt-4 display-2 font-bold text-ink text-balance">{t("sectorsTitle")}</h2>
            <p className="mt-5 text-lg text-ink-2 text-pretty">{t("sectorsSub")}</p>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-px bg-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden border border-line">
            {sectors.map((s, i) => (
              <Reveal key={s.id} delay={i * 50} className="group bg-surface p-6 hover:bg-surface-2 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <span className="grid place-items-center size-10 rounded-[var(--radius-md)] border border-line bg-surface-2 text-brand group-hover:border-line-gold transition-colors">
                    <SectorIcon name={s.icon} size={18} />
                  </span>
                  <span className="font-display font-semibold text-ink">{s.label}</span>
                </div>
                <p className="text-sm text-ink-3 text-pretty">{s.blurb}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── SUCCESS FEE / ALINHAMENTO ──────────────── */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <Eyebrow>{sectionNo("05")}{t("feesEyebrow")}</Eyebrow>
            <h2 className="mt-4 display-2 font-bold text-ink text-balance">{t("feesTitle")}</h2>
            <p className="mt-5 text-lg text-ink-2 text-pretty">{t("feesBody")}</p>
            <ul className="mt-8 space-y-3">
              {[t("feesPoint1"), t("feesPoint2"), t("feesPoint3")].map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="grid place-items-center size-5 rounded-full bg-[var(--positive-soft)] text-positive shrink-0 mt-0.5"><Check size={13} /></span>
                  <span className="text-ink-2">{p}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative panel hairline p-8">
              <div className="aurora opacity-40" />
              <div className="relative">
                <Quote size={28} className="text-brand mb-4" />
                <p className="font-display text-xl text-ink text-pretty leading-snug">
                  "Capturamos R$ 14,8 mi em janelas que teriam fechado sem ninguém ver. O fee só apareceu depois que o dinheiro entrou."
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="grid place-items-center size-10 rounded-full bg-surface-3 text-brand font-display font-semibold">MA</span>
                  <div>
                    <p className="text-sm text-ink font-medium">Marina Alves</p>
                    <p className="text-xs text-ink-4">CFO · Acme Participações S.A.</p>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-px bg-[color:var(--border)] rounded-[var(--radius-md)] overflow-hidden border border-line">
                  {[
                    { v: fmt.moneyCompact(14_820_000), l: tc("realized") },
                    { v: "18%", l: t("pricingFeeNote").replace("+ success fee sobre a economia capturada", "success fee") },
                    { v: "6", l: tc("viewAll") },
                  ].map((m, i) => (
                    <div key={i} className="bg-surface p-4">
                      <p className="font-display font-bold text-lg text-ink tnum">{m.v}</p>
                      <p className="text-[0.7rem] text-ink-4 mt-0.5">{m.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ──────────────────────── PLANOS ──────────────────────── */}
      <section id="pricing" className="relative py-20 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="text-center max-w-2xl mx-auto">
            <Eyebrow className="justify-center">{sectionNo("06")}{t("pricingEyebrow")}</Eyebrow>
            <h2 className="mt-4 display-2 font-bold text-ink text-balance">{t("pricingTitle")}</h2>
            <p className="mt-5 text-lg text-ink-2 text-pretty">{t("pricingSub")}</p>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-5 items-start">
            {plans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 100}>
                <div className={`relative panel p-7 flex flex-col h-full ${plan.popular ? "border-line-gold shadow-[var(--shadow-gold)]" : "hairline"}`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand text-on-brand px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles size={12} /> {t("pricingPopular")}
                    </span>
                  )}
                  <h3 className="font-display font-semibold text-xl text-ink">{plan.name}</h3>
                  <p className="mt-1 text-sm text-ink-3">{plan.tagline}</p>
                  <div className="mt-5 flex items-end gap-1">
                    <span className="font-display font-bold text-4xl text-ink tnum">{fmt.money(plan.price)}</span>
                    <span className="text-ink-4 text-sm mb-1.5">{t("pricingMonth")}</span>
                  </div>
                  {plan.feeRate > 0 && <p className="mt-1 mono text-[0.7rem] text-brand">{t("pricingFeeNote")} · {fmt.percent(plan.feeRate)}</p>}
                  <Link href={`/${locale}/login`} className={buttonClass(plan.popular ? "primary" : "secondary", "md", "mt-6 w-full")}>
                    {t("pricingCta")}
                  </Link>
                  <ul className="mt-7 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-ink-2">
                        <Check size={15} className="text-brand shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── FAQ ──────────────────────── */}
      <section className="relative py-20">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal className="text-center mb-12">
            <Eyebrow className="justify-center">{sectionNo("07")}{t("faqEyebrow")}</Eyebrow>
            <h2 className="mt-4 display-2 font-bold text-ink text-balance">{t("faqTitle")}</h2>
          </Reveal>
          <Reveal delay={80}>
            <Faq items={faqItems} />
          </Reveal>
        </div>
      </section>

      {/* ──────────────────── CTA FINAL ──────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="aurora" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40" />
        <Reveal className="relative mx-auto max-w-3xl px-6 text-center">
          <Mark size={56} className="mx-auto mb-8 animate-[float_7s_ease-in-out_infinite]" />
          <h2 className="display-2 font-bold text-ink text-balance">{t("finalTitle")}</h2>
          <p className="mt-5 text-lg text-ink-2 text-pretty max-w-xl mx-auto">{t("finalSub")}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href={`/${locale}/login`} className={buttonClass("primary", "lg", "group")}>
              {t("finalCta")}
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Chip tone="gold">{t("heroNote")}</Chip>
          </div>
        </Reveal>
      </section>

      <SiteFooter locale={locale} />
    </div>
  );
}
