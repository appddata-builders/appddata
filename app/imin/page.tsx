"use client";

import Link from "next/link";
import { LuMousePointerClick, LuRocket, LuShieldCheck } from "react-icons/lu";

import IminMark from "../components/imin/imin-mark";
import IminParallax from "../components/imin/imin-parallax";
import IminTutorial from "../components/imin/imin-tutorial";
import SiteFooter from "../components/site-footer";
import { useT } from "@/lib/text/text-provider";

/** Beneficios y periodos: el icono/estilo aqui, el texto en `hydrate`. */
const benefits = [
  { key: "es.imin.benefits.1", icon: <LuMousePointerClick className="h-5 w-5" aria-hidden="true" /> },
  { key: "es.imin.benefits.2", icon: <LuRocket className="h-5 w-5" aria-hidden="true" /> },
  { key: "es.imin.benefits.3", icon: <LuShieldCheck className="h-5 w-5" aria-hidden="true" /> },
];

const accessTiers = [
  { key: "es.imin.tiers.1", featured: false, hasEquivalent: false },
  { key: "es.imin.tiers.2", featured: true, hasEquivalent: true },
  { key: "es.imin.tiers.3", featured: false, hasEquivalent: true },
];

export default function IminPage() {
  const t = useT();

  return (
    <main className="app-min-h-screen bg-white text-[#111827]">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,189,22,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,189,22,0.08),transparent_28%)]" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#071E9C]">
                {t("es.imin.hero.eyebrow")}
              </p>
              <h1 className="mt-4 text-4xl font-light tracking-[0.08em] text-[#111827] sm:text-6xl">
                {t("es.imin.hero.title")}
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
                {t("es.imin.hero.description")}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#demostracion-imin"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#0C6CC6] px-6 text-sm font-semibold text-white transition hover:bg-[#095aa7]"
                >
                  {t("es.imin.hero.demo")}
                </a>
                <Link
                  href="#accesos-imin"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  {t("es.imin.hero.access")}
                </Link>
              </div>
            </div>

            <div className="relative mx-auto h-72 w-full max-w-88 overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-slate-300/40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(66,111,235,0.18),transparent_44%)]" />
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <IminMark
                  className="h-32 w-32 sm:h-36 sm:w-36"
                  imageClassName="drop-shadow-slate-300/40"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3">
        {benefits.map((benefit) => (
          <article key={benefit.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,0.06)]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0C6CC6]">
              {benefit.icon}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">{t(`${benefit.key}.title`)}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t(`${benefit.key}.description`)}</p>
          </article>
        ))}
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
        <IminParallax />
      </div>

      <section id="accesos-imin" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.4em] text-[#0C6CC6]">
              {t("es.imin.access.eyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-light tracking-[0.06em] text-slate-950 sm:text-5xl">
              {t("es.imin.access.title")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              {t("es.imin.access.description")}
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {accessTiers.map((tier) => (
              <article
                key={tier.key}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] ${
                  tier.featured ? "border-amber-400" : "border-slate-200"
                }`}
              >
                {tier.featured ? (
                  <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-amber-800">
                    {t("es.imin.access.recommended")}
                  </span>
                ) : null}
                <IminMark className="h-7 w-7" />
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{t(`${tier.key}.name`)}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-bold tracking-[-0.04em] text-slate-950">{t(`${tier.key}.price`)}</span>{" "}
                  <span className="text-xs font-medium text-slate-500">{t("es.imin.access.currency")}</span>
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{t(`${tier.key}.description`)}</p>
                {tier.hasEquivalent ? (
                  <>
                    <p className="mt-3 text-xs font-semibold text-slate-700">{t(`${tier.key}.equivalent`)}</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-600">{t(`${tier.key}.saving`)}</p>
                  </>
                ) : null}
                <Link
                  href="/account"
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {t("es.imin.access.activate")}
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            {t("es.imin.access.trial")}
          </p>
        </div>
      </section>

      <div id="demostracion-imin" className="scroll-mt-20">
        <IminTutorial />
      </div>

      <SiteFooter />
    </main>
  );
}
