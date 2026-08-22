/**
 * Modelo de cobro de Appddata por servicios administrados.
 *
 *   cobro = base + (costo_infra_prorrateado x margen)
 *   total = gross-up de la comision de Stripe sobre ese cobro
 *
 * El costo de DigitalOcean es INTERNO. Al cliente se le muestra el resultado
 * (base, consumo, comision, total), nunca el costo de infraestructura ni el
 * saldo/creditos de la cuenta de Appddata: esos creditos los absorbe Appddata y
 * no deben descontarle nada al usuario final.
 */

function envNumber(name: string, fallback: number): number {
  const parsed = Number.parseFloat(process.env[name] ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Base mensual por dominio, en centavos MXN.
 *
 * Es la parte ESTABLE del recibo: no se mueve con el consumo, asi que subirla y
 * bajar el margen hace el precio mas predecible para el cliente. Bajarla y
 * subir el margen hace lo contrario: sigue al consumo y protege a Appddata.
 */
export function serviceBaseCents(): number {
  return Math.round(envNumber("APPDDATA_SERVICE_BASE_MXN", 150) * 100);
}

/** Comision de Stripe en Mexico para tarjeta nacional. */
export const STRIPE_PERCENT = 0.036;
export const STRIPE_FIXED_CENTS = 300;

/** Multiplicador sobre el costo de infraestructura prorrateado. */
export function serviceMargin(): number {
  return envNumber("APPDDATA_SERVICE_MARGIN", 2.5);
}

/**
 * Cuantos proyectos esta dimensionado para sostener el cluster.
 *
 * Es el numero clave del modelo: el reparto se hace contra ESTA capacidad, no
 * contra los inquilinos que haya hoy. Si se dividiera entre los actuales, dos
 * clientes cargarian el cluster entero y su recibo se abarataria cada vez que
 * entra uno nuevo. El precio de un sitio no puede depender de cuantos vecinos
 * tenga, y la capacidad ociosa la absorbe Appddata, no el cliente.
 */
export function plannedCapacity(): number {
  return Math.max(1, Math.round(envNumber("APPDDATA_CLUSTER_CAPACITY", 6)));
}

/**
 * IVA que el proveedor te cobra sobre la infraestructura.
 *
 * El desglose de la factura viene sin impuesto, pero tu si lo pagas. Si el
 * prorrateo partiera del monto sin IVA, repartirias un 16% menos del costo real
 * y esa diferencia te la comerias tu.
 */
export function infraTaxRate(): number {
  const parsed = Number.parseFloat(process.env.APPDDATA_INFRA_IVA ?? "");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.16;
}

/** IVA que Appddata traslada al cliente sobre el servicio. */
export function clientTaxRate(): number {
  const parsed = Number.parseFloat(process.env.APPDDATA_CLIENT_IVA ?? "");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.16;
}

export type ProjectShare = {
  slug: string;
  /** Parte del cluster que consumen SUS pods. */
  ownShare: number;
  /** Parte del pod de base que le toca segun el peso de su esquema. */
  databaseShare: number;
  /** Parte de la plataforma compartida (ingress, certificados) que le toca. */
  platformShare: number;
};

/**
 * Reparte el costo del cluster entre los proyectos.
 *
 * Se prorratea por lo RESERVADO (requests) y no por el uso instantaneo: el uso
 * que reporta metrics-server es una foto del momento, asi que facturar con el
 * haria que el recibo cambiara segun el minuto en que se abre la pantalla. Lo
 * reservado es lo que de verdad aparta capacidad en el nodo y es estable.
 *
 * El pod de la base de datos es compartido, asi que su parte no se le carga a
 * nadie de golpe: se reparte entre los dominios segun el peso del ESQUEMA que
 * le corresponde a cada uno.
 */
export function prorateProjects(input: {
  projects: { slug: string; cpu: number; memory: number }[];
  /** Pod de PostgreSQL: infraestructura compartida. */
  database: { cpu: number; memory: number } | null;
  /**
   * Servicios de plataforma que existen para servir a TODOS los sitios
   * (ingress, emision de certificados). No son de nadie en particular, asi que
   * su costo se reparte en proporcion a lo que cada proyecto consume.
   */
  platform: { cpu: number; memory: number } | null;
  /** Bytes del esquema de cada dominio, por slug. */
  schemaBytes: Record<string, number>;
}): ProjectShare[] {
  const { projects, database, platform, schemaBytes } = input;
  if (projects.length === 0) return [];

  const totalCpu =
    projects.reduce((sum, p) => sum + p.cpu, 0) + (database?.cpu ?? 0) + (platform?.cpu ?? 0);
  const totalMemory =
    projects.reduce((sum, p) => sum + p.memory, 0) + (database?.memory ?? 0) + (platform?.memory ?? 0);
  if (totalCpu <= 0 && totalMemory <= 0) {
    // Sin datos de recursos, reparto parejo antes que inventar un peso.
    return projects.map((project) => ({
      slug: project.slug,
      ownShare: 1 / plannedCapacity(),
      databaseShare: 0,
      platformShare: 0,
    }));
  }

  // Mezcla 50/50 de CPU y memoria: ninguna de las dos por si sola representa
  // lo que cuesta un nodo.
  const blend = (cpu: number, memory: number) =>
    (totalCpu > 0 ? cpu / totalCpu : 0) * 0.5 + (totalMemory > 0 ? memory / totalMemory : 0) * 0.5;

  // Se reparte entre las plazas PLANEADAS, no entre las ocupadas: con 2 de 6
  // llenas, cada proyecto paga 1/6 y las 4 vacias corren por cuenta de
  // Appddata. Asi el recibo no se mueve cuando entra o sale otro cliente.
  const capacityScale = projects.length / plannedCapacity();

  const databaseShare = database ? blend(database.cpu, database.memory) : 0;
  const platformShare = platform ? blend(platform.cpu, platform.memory) : 0;
  const totalSchemaBytes = projects.reduce((sum, p) => sum + (schemaBytes[p.slug] ?? 0), 0);

  /**
   * Peso de un proyecto que no se pudo medir.
   *
   * Un pod caido, reiniciandose o recien desplegado no aparece en el cluster, y
   * darle peso cero significaria dejar de cobrarle el consumo de todo el mes
   * aunque la capacidad siguiera reservada para el (y aunque el proveedor nos
   * la siga cobrando). Se le asigna lo que ocupa un proyecto promedio.
   */
  const measured = projects.map((p) => blend(p.cpu, p.memory)).filter((value) => value > 0);
  const standardSlot = measured.length > 0
    ? measured.reduce((sum, value) => sum + value, 0) / measured.length
    : 1 / plannedCapacity();

  const ownOf = (project: { cpu: number; memory: number }) => {
    const own = blend(project.cpu, project.memory);
    return own > 0 ? own : standardSlot;
  };
  const totalOwn = projects.reduce((sum, p) => sum + ownOf(p), 0);

  return projects.map((project) => {
    const own = ownOf(project);
    const schemaFraction =
      totalSchemaBytes > 0
        ? (schemaBytes[project.slug] ?? 0) / totalSchemaBytes
        : 1 / projects.length; // sin medida de esquemas, la base se reparte pareja
    // La plataforma sigue al tamano del proyecto: quien mas consume, mas
    // ingress y mas certificados mueve.
    const ownFraction = totalOwn > 0 ? own / totalOwn : 1 / projects.length;
    return {
      slug: project.slug,
      ownShare: own * capacityScale,
      databaseShare: databaseShare * schemaFraction * capacityScale,
      platformShare: platformShare * ownFraction * capacityScale,
    };
  });
}

/**
 * Cargo desglosado por componente, que es como se dibuja en la grafica: cada
 * pieza dice QUE lo esta generando.
 */
export type ProjectCharge = {
  slug: string;
  /** Parte del cluster que le toca, de 0 a 1. */
  share: number;
  baseCents: number;
  /** Sus propios pods, con margen aplicado. */
  computeCents: number;
  /** Su porcion del pod de PostgreSQL, por peso de esquema. */
  databaseCents: number;
  /** Su porcion de ingress y emision de certificados. */
  platformCents: number;
  /** computeCents + databaseCents + platformCents. */
  consumptionCents: number;
  /** Base gravable: base + consumo + comision, antes de IVA. */
  subtotalCents: number;
  stripeFeeCents: number;
  taxCents: number;
  totalCents: number;
};

/** Convierte un monto mensual de infraestructura en centavos MXN con margen. */
function withMargin(usd: number, fxRate: number): number {
  return Math.round(usd * (1 + infraTaxRate()) * fxRate * 100 * serviceMargin());
}

/**
 * Cobro de un dominio. `clusterMonthlyUsd` es el costo mensual del cluster
 * COMPLETO (proyeccion del mes, no lo corrido: el cobro es mensual); aqui se le
 * aplican las dos participaciones del proyecto.
 */
export function chargeForProject(
  slug: string,
  share: ProjectShare,
  clusterMonthlyUsd: number,
  fxRate: number,
): ProjectCharge {
  const computeCents = withMargin(clusterMonthlyUsd * share.ownShare, fxRate);
  const databaseCents = withMargin(clusterMonthlyUsd * share.databaseShare, fxRate);
  const platformCents = withMargin(clusterMonthlyUsd * share.platformShare, fxRate);
  const consumptionCents = computeCents + databaseCents + platformCents;
  const baseCents = serviceBaseCents();
  const price = priceBreakdown(baseCents + consumptionCents);

  return {
    slug,
    share: share.ownShare + share.databaseShare + share.platformShare,
    baseCents,
    computeCents,
    databaseCents,
    platformCents,
    consumptionCents,
    subtotalCents: price.subtotalCents,
    stripeFeeCents: price.stripeFeeCents,
    taxCents: price.taxCents,
    totalCents: price.totalCents,
  };
}

export type PriceBreakdown = {
  /** Base gravable: lo que Appddata cobra, comision incluida, antes de IVA. */
  subtotalCents: number;
  stripeFeeCents: number;
  taxCents: number;
  totalCents: number;
};

/**
 * Convierte lo que Appddata quiere conservar en el precio final al cliente.
 *
 * Hay que resolver las dos cosas a la vez porque se muerden la cola: Stripe
 * cobra su comision sobre el total (que ya trae IVA) y el IVA se calcula sobre
 * la base gravable (que ya trae la comision). Despejando:
 *
 *   base = (neto + comision_fija) / [(1 + iva)(1 - comision_%) - iva]
 *
 * Asi, despues de que Stripe cobra y de enterar el IVA al SAT, a Appddata le
 * queda exactamente `netCents`.
 */
export function priceBreakdown(netCents: number): PriceBreakdown {
  if (netCents <= 0) return { subtotalCents: 0, stripeFeeCents: 0, taxCents: 0, totalCents: 0 };

  const tax = clientTaxRate();
  const divisor = (1 + tax) * (1 - STRIPE_PERCENT) - tax;
  const subtotalCents = Math.ceil((netCents + STRIPE_FIXED_CENTS) / divisor);
  const taxCents = Math.round(subtotalCents * tax);

  return {
    subtotalCents,
    stripeFeeCents: subtotalCents - netCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

/** Suma de varios dominios. La comision se recalcula sobre el subtotal unico. */
export function combineCharges(charges: ProjectCharge[]): {
  baseCents: number;
  computeCents: number;
  databaseCents: number;
  platformCents: number;
  consumptionCents: number;
  subtotalCents: number;
  stripeFeeCents: number;
  taxCents: number;
  totalCents: number;
} {
  const baseCents = charges.reduce((sum, charge) => sum + charge.baseCents, 0);
  const computeCents = charges.reduce((sum, charge) => sum + charge.computeCents, 0);
  const databaseCents = charges.reduce((sum, charge) => sum + charge.databaseCents, 0);
  const platformCents = charges.reduce((sum, charge) => sum + charge.platformCents, 0);
  const consumptionCents = computeCents + databaseCents + platformCents;
  // Un solo cobro = una sola comision, no una por dominio.
  const price = priceBreakdown(baseCents + consumptionCents);
  return {
    baseCents,
    computeCents,
    databaseCents,
    platformCents,
    consumptionCents,
    subtotalCents: price.subtotalCents,
    stripeFeeCents: price.stripeFeeCents,
    taxCents: price.taxCents,
    totalCents: price.totalCents,
  };
}
