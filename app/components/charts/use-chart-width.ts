"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ancho real del contenedor para dibujar el SVG en pixeles 1:1.
 *
 * Se mide en vez de escalar un viewBox fijo porque `preserveAspectRatio`
 * encogeria tambien el texto de los ejes: en movil las etiquetas quedarian
 * ilegibles y las colisiones de labels aparecerian solo en ciertos anchos.
 */
export function useChartWidth(fallback = 720) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next && next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
