/**
 * Tipo de cambio USD -> MXN en vivo.
 *
 * DigitalOcean factura en dolares y el cobro se emite en pesos, asi que el tipo
 * de cambio entra directo al monto: un valor fijo en codigo se desactualiza y
 * factura de mas o de menos sin que nadie lo note.
 *
 * Fuente: Frankfurter con el proveedor BANXICO, que es la referencia oficial en
 * Mexico. Si la API no responde se usa `USD_MXN_RATE` y, en ultimo caso, un
 * valor de emergencia; la vista siempre dice cual se aplico.
 */

const FRANKFURTER_URL = "https://api.frankfurter.dev/v2/rate/USD/MXN?providers=BANXICO";

/** Solo cubre el hueco cuando no hay API ni variable de entorno configurada. */
const EMERGENCY_RATE = 17;

/** El tipo publica una vez al dia: no tiene caso pedirlo en cada carga. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export type FxRate = {
  rate: number;
  /** Fecha de la cotizacion, en formato YYYY-MM-DD. */
  date: string | null;
  source: "banxico" | "env" | "emergencia";
};

let cached: { at: number; value: FxRate } | null = null;

function configuredRate(): FxRate | null {
  const parsed = Number.parseFloat(process.env.USD_MXN_RATE ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? { rate: parsed, date: null, source: "env" } : null;
}

export async function getUsdMxnRate(): Promise<FxRate> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    const response = await fetch(FRANKFURTER_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`Frankfurter respondio ${response.status}.`);

    const body = (await response.json()) as { rate?: number; date?: string };
    if (!Number.isFinite(body.rate) || (body.rate ?? 0) <= 0) {
      throw new Error("Frankfurter no devolvio una cotizacion valida.");
    }

    const value: FxRate = { rate: body.rate as number, date: body.date ?? null, source: "banxico" };
    cached = { at: Date.now(), value };
    return value;
  } catch {
    // Nunca se tumba el panel por el tipo de cambio: se degrada y se avisa.
    const value = configuredRate() ?? { rate: EMERGENCY_RATE, date: null, source: "emergencia" as const };
    cached = { at: Date.now(), value };
    return value;
  }
}

/** Etiqueta para la vista: de donde salio el tipo de cambio que se aplico. */
export function fxSourceLabel(fx: FxRate): string {
  if (fx.source === "banxico") return fx.date ? `Banxico ${fx.date}` : "Banxico";
  if (fx.source === "env") return "valor configurado";
  return "valor de emergencia";
}
