"use client";

import { createContext, useContext, useMemo } from "react";

import { makeTranslate, type Translate } from "./resolve";

/**
 * Entrega a los componentes de cliente el mismo mapa de textos que el layout
 * leyo de la tabla `hydrate`. Se inyecta una sola vez en el layout raiz y de
 * ahi lo toman todas las pantallas con `useT()`.
 */

const TextContext = createContext<Record<string, string> | null>(null);

export function TextProvider({
  texts,
  children,
}: {
  texts: Record<string, string>;
  children: React.ReactNode;
}) {
  return <TextContext.Provider value={texts}>{children}</TextContext.Provider>;
}

/** Devuelve el `t(clave)` del sitio. Sin valores por defecto en linea. */
export function useT(): Translate {
  const texts = useContext(TextContext);
  if (!texts) {
    throw new Error("useT debe usarse dentro de <TextProvider>");
  }
  return useMemo(() => makeTranslate(texts), [texts]);
}
