import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-min-h-screen relative isolate flex items-center overflow-hidden bg-[#f8fbff] px-4 pb-12 pt-28 text-slate-900 sm:px-6 sm:pt-32">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -z-20 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9edff]/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-32 -top-28 -z-10 h-80 w-80 rounded-full border-[4rem] border-white/70"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-36 -left-24 -z-10 h-80 w-80 rounded-full border-[4rem] border-[#c7e4ff]/40"
      />

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="text-center lg:text-left">
          <Link
            href="/"
            aria-label="Ir al inicio de Appddata"
            className="inline-flex items-center transition-opacity hover:opacity-75"
          >
            <span className="relative h-[25px] w-[52px] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand-plane.png"
                alt=""
                className="h-full w-full object-contain"
                decoding="async"
              />
            </span>
            <span className="flex overflow-hidden text-[1.35rem] font-semibold tracking-[0.12em]">
              <span className="text-[#589bf9]">app</span>
              <span className="text-[#8a8b8c]">ddata</span>
            </span>
          </Link>

          <p className="mt-10 text-[0.68rem] font-bold uppercase tracking-[0.38em] text-[#0C6CC6]">
            Error 404 · Ruta no encontrada
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em] text-slate-900 sm:text-5xl lg:text-6xl">
            Parece que este sitio
            <span className="block text-[#589bf9]">tomó otro rumbo.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 tracking-[0.02em] text-slate-600 sm:text-base lg:mx-0">
            La página que buscas no existe, cambió de dirección o todavía está por
            despegar. Puedes regresar al inicio y continuar explorando.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/"
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#0C6CC6] px-6 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-[0_14px_35px_rgba(12,108,198,0.22)] transition hover:-translate-y-0.5 hover:bg-[#095aa7]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="m3 11 9-8 9 8" />
                <path d="M5 10v10h14V10" />
                <path d="M9 20v-6h6v6" />
              </svg>
              Volver al inicio
            </Link>
            <Link
              href="/products"
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#b9daf7] bg-white/80 px-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#0C6CC6] transition hover:-translate-y-0.5 hover:border-[#589bf9] hover:bg-white"
            >
              Ver productos
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              >
                <path d="M7 17 17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="relative mx-auto flex aspect-square w-full max-w-[34rem] items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute inset-[7%] rounded-full border border-dashed border-[#8fc7f4]/70"
          />
          <div
            aria-hidden="true"
            className="absolute inset-[17%] rounded-full border border-[#c6e2fa] bg-white/55 shadow-[0_30px_90px_rgba(12,108,198,0.12)] backdrop-blur-sm"
          />
          <span
            aria-hidden="true"
            className="absolute left-[12%] top-[25%] h-3 w-3 rounded-full bg-[#589bf9] shadow-[0_0_0_8px_rgba(88,155,249,0.12)]"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-[18%] right-[17%] h-2 w-2 rounded-full bg-[#8a8b8c] shadow-[0_0_0_7px_rgba(138,139,140,0.1)]"
          />

          <div className="relative flex flex-col items-center">
            <p className="select-none text-[7.5rem] font-bold leading-none tracking-[-0.12em] text-[#0C6CC6] sm:text-[10rem]">
              4<span className="text-[#8fc7f4]">0</span>4
            </p>
            <div className="mt-5 flex items-center gap-3 text-[0.62rem] font-bold uppercase tracking-[0.34em] text-slate-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-[#589bf9]"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
                <path d="M21 12H9" />
              </svg>
              Regresemos a casa
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
