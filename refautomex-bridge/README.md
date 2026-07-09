# Puente de edicion IMIN → refautomex

Este script vive en **refautomex.com** (el sitio que se incrusta), no en esta app.
La app IMIN incrusta refautomex en un `<iframe>` y le envia comandos por `postMessage`;
este bridge los ejecuta dentro del sitio real.

## Como funciona

- **Navegar**: el bridge no interviene, el sitio navega normal.
- **Editar textos**: al hacer clic en un texto se bloquea la navegacion y ese
  elemento se vuelve `contentEditable`. Al escribir/salir, el cambio se devuelve
  al editor por `postMessage`.
- **Editar imagenes**: al hacer clic en una imagen se avisa al editor; este abre
  el selector de archivo y responde con `set-image` para reemplazar el `src`.
- El **scroll nunca se bloquea**.
- Solo se activa cuando la pagina esta **dentro de un iframe**, asi que los
  visitantes normales no se ven afectados.

## Instalacion en refautomex (Next.js)

1. Copia `imin-editor-bridge.js` a la carpeta `public/` de refautomex.
2. En el `app/layout.tsx` de refautomex, cargalo con `next/script`:

   ```tsx
   import Script from "next/script";

   // dentro de <body>:
   <Script src="/imin-editor-bridge.js" strategy="afterInteractive" />
   ```

3. **Importante:** edita `ALLOWED_PARENT_ORIGINS` dentro del script y agrega el
   origen donde corras/desplieques el editor IMIN. Ya incluye
   `http://localhost:3000` para desarrollo local.

## Protocolo de mensajes

Editor (padre) → bridge (hijo), `source: "imin-editor"`:

- `{ type: "set-mode", mode: "navigate" | "text" | "image" }`
- `{ type: "set-image", selector, src }`

Bridge (hijo) → editor (padre), `source: "refautomex-bridge"`:

- `{ type: "ready" }`
- `{ type: "text-selected", selector, value }`
- `{ type: "text-changed", selector, value }`
- `{ type: "image-selected", selector }`

## Persistencia (siguiente paso)

Hoy los cambios son en vivo y efimeros (viven en el DOM del iframe hasta recargar).
Para guardarlos de verdad hay que decidir donde persistir (`selector` + valor) en
refautomex: base de datos, CMS, o un endpoint que reescriba el contenido.
