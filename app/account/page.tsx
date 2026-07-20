import Link from "next/link";
import { redirect } from "next/navigation";

import { requirePanelSession } from "@/lib/require-panel-session";

import Brand from "../components/brand";

export default async function AccountPage() {
  // Con sesion viva esta pantalla no aporta nada: se entra directo al panel.
  const session = await requirePanelSession();
  if (session) redirect("/dashboard");

  return <AccountLanding />;
}

function AccountLanding() {
  return (
    <main className="app-min-h-screen bg-white px-4 pb-10 text-[#111827] sm:px-6 sm:pb-14">
      <div className="app-min-h-screen-nav-offset mx-auto flex w-full max-w-5xl items-center justify-center pt-24 sm:pt-28">
        <section className="w-full rounded-[2.25rem] border border-slate-200 bg-white px-5 py-8 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Brand size="md" />
              <p className="mt-8 text-[0.7rem] uppercase tracking-[0.42em] text-[#2a2a2b]">
                Cuenta y panel interno
              </p>
              <h1 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
                Accede a tu cuenta
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
                Gestiona tus contenidos y manten tu sitio web actualizado.
              </p>
            </div>

            <div className="grid gap-3 sm:min-w-[19rem]">
              <Link
                href="/account/register"
                className="rounded-full border border-[#589bf9]/24 bg-[#589bf9]/8 px-5 py-3 text-center text-sm uppercase tracking-[0.26em] text-blue-800 transition hover:bg-[#589bf9]/18"
              >
                Crear cuenta
              </Link>
              <Link
                href="/account/login"
                className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm uppercase tracking-[0.26em] text-slate-800 transition hover:bg-slate-100"
              >
                Iniciar sesion
              </Link>
              <Link
                href="/account/forgot-password"
                className="rounded-full border border-slate-200 bg-transparent px-5 py-3 text-center text-sm uppercase tracking-[0.26em] text-slate-600 transition hover:text-slate-700"
              >
                Olvide mi contrasena
              </Link>
              <Link
                href="/"
                className="pt-3 text-center text-[0.72rem] uppercase tracking-[0.3em] text-blue-600 transition hover:text-slate-700"
              >
                Volver al home
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
