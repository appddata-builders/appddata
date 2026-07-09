import IminMark from "../components/imin/imin-mark";
import IminParallax from "../components/imin/imin-parallax";
import IminTutorial from "../components/imin/imin-tutorial";
import SiteFooter from "../components/site-footer";

export default function IminPage() {
  return (
    <main className="app-min-h-screen bg-white text-[#111827]">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,189,22,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,189,22,0.08),transparent_28%)]" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#071E9C]">
                Tu web siempre fresca.
              </p>
              <h1 className="mt-4 text-4xl font-light tracking-[0.08em] text-[#111827] sm:text-6xl">
                IMIN
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
                Actualiza textos, imagenes y cuida de la presentacion de tu sitio web para que tus
                clientes no se queden desactualizados.
              </p>
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

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
        <IminParallax />
      </div>

      <IminTutorial />

      <SiteFooter />
    </main>
  );
}
