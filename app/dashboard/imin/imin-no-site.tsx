"use client";

import Link from "next/link";
import { LuArrowRight, LuLayoutTemplate } from "react-icons/lu";

/**
 * Estado vacio del editor IMIN cuando la cuenta aun no tiene un sitio que
 * gestionar. Vive como client component porque usa react-icons: esos iconos
 * dependen de contexto de React y no pueden renderizarse desde el server
 * component de la pagina (se serializarian como funcion y romperian el RSC).
 */
export function IminNoSite({ hasUnassignedSitePackage }: { hasUnassignedSitePackage: boolean }) {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#0C6CC6]">
        <LuLayoutTemplate className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        IMIN estará listo después
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
        Primero crea tu sitio web
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
        IMIN necesita un sitio publicado para mostrar, editar y guardar cambios. Cuando termines
        de construir tu sitio, podrás iniciar la prueba gratuita o activar un periodo de acceso.
      </p>
      <Link
        href={hasUnassignedSitePackage ? "/dashboard/build" : "/dashboard"}
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0C6CC6] px-5 text-sm font-semibold text-white transition hover:bg-[#095aa7]"
      >
        {hasUnassignedSitePackage ? "Crear mi sitio" : "Ver paquetes"}
        <LuArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
