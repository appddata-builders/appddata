import AboutTimeline from "../components/about/about-timeline";
import AboutValues from "../components/about/about-values";
import SiteFooter from "../components/site-footer";
import { getT } from "@/lib/text/server-text";

export default async function AboutPage() {
  const t = await getT();

  return (
    <main className="app-min-h-screen bg-white text-[#111827]">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(66,111,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,81,245,0.10),transparent_30%)]" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10">
          <div className="max-w-4xl">
            <p className="text-[0.7rem] uppercase tracking-[0.45em] text-cyan-700">
              {t("es.about.logic")}
            </p>
            <h1 className="mt-4 text-4xl font-light tracking-[0.08em] text-[#111827] sm:text-6xl">
              {t("es.about.operate")}
            </h1>
            <p className="mt-6 max-w-3xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
              {t("es.about.operate.description")}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
        <AboutTimeline />
        <AboutValues />
      </div>

      <SiteFooter />
    </main>
  );
}
