import { getHydratedTexts } from "@/lib/hydrate/texts";
import { makeTranslate, type Translate } from "./resolve";

/**
 * `t` para Server Components y `generateMetadata`.
 *
 * `useT` es un hook de cliente y la metadata se arma en el servidor, asi que
 * sin esto los titulos y descripciones quedarian en duro. Lee el mismo mapa de
 * la tabla `hydrate` que consume el provider.
 */
export async function getT(): Promise<Translate> {
  const texts = await getHydratedTexts();
  return makeTranslate(texts);
}

export type { Translate };
