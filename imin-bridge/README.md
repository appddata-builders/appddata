# IMIN editor bridge

Script generico que se instala en **el sitio que se quiere editar** (el hijo), no
en esta app. IMIN incrusta ese sitio en un `<iframe>` y le manda comandos por
`postMessage`; el bridge los ejecuta sobre el DOM real.

No sabe nada del proyecto en el que corre: el mismo archivo sirve para
refautomex, pulsety, lake-sport-club o cualquier otro sitio, sea cual sea su
framework. Lo unico que se configura por sitio son los origenes del editor que
acepta.

## Instalacion

1. Copia `imin-editor-bridge.js` a la carpeta publica del sitio (`public/` en
   Next.js) para que se sirva como `/imin-editor-bridge.js`.
2. Cargalo en el layout. Con Next.js:

   ```tsx
   import Script from "next/script";

   <Script src="/imin-editor-bridge.js" strategy="afterInteractive" />
   ```

   En HTML plano basta `<script src="/imin-editor-bridge.js" defer></script>`.

3. Declara desde donde se le permite hablar. Si no configuras nada, acepta
   `http://localhost:3000`, `https://appddata.netlify.app` y `https://appstract.netlify.app`.

   ```html
   <script src="/imin-editor-bridge.js" data-imin-origins="https://editor.midominio.com"></script>
   ```

   o, antes de cargarlo:

   ```html
   <script>window.IMIN_ALLOWED_ORIGINS = ["https://editor.midominio.com"];</script>
   ```

No hace falta editar el archivo para instalarlo en un proyecto nuevo.

## Modos

| Modo | Que permite |
|---|---|
| `navigate` | El bridge no interviene: el sitio navega normal. |
| `text` | Clic directo sobre un texto: se edita en linea. Al pasar el cursor aparece un lapiz que abre el panel del editor (descripcion y color). |
| `media` | Clic sobre una imagen, un video o un fondo con imagen para reemplazarlo. Los videos solo aceptan mp4. |
| `style` | Clic sobre un icono para cambiarlo, o sobre un contenedor **que ya tenga fondo propio** para repintarlo. |

Reglas que el bridge respeta a proposito:

- **Nunca crea contenido**: solo edita texto que ya existe y solo pinta fondos ya
  definidos por el diseño. No se pueden agregar fondos donde no los habia.
- En modo `media` atraviesa capas: alcanza imagenes tapadas por overlays
  transparentes o con `pointer-events: none`.
- El **scroll nunca se bloquea**; los demas modos si congelan la navegacion
  (incluidas `history`, `location`, `window.open` y `form.submit`).
- Solo se activa **dentro de un iframe**, asi que los visitantes normales no se
  ven afectados.

## Protocolo de mensajes

Editor (padre) → bridge (hijo), con `source: "imin-editor"`:

| Mensaje | Campos |
|---|---|
| `set-mode` | `mode`: `navigate` \| `text` \| `media` \| `style` |
| `set-text` | `selector`, `value` |
| `set-media` | `selector`, `kind`: `image` \| `background` \| `video`, `src` |
| `set-color` | `selector`, `colorTarget`: `text` \| `background`, `fill`: `solid` \| `gradient`, `color`, `colorEnd`, `direction`: `left` \| `right` |
| `set-icon` | `selector`, `svg` |

Bridge (hijo) → editor (padre), con `source: "imin-bridge"`:

| Mensaje | Campos |
|---|---|
| `ready` | — |
| `text-selected` | `selector`, `value`, `color` |
| `text-changed` | `selector`, `value` |
| `media-selected` | `selector`, `kind` |
| `color-selected` | `selector` |
| `icon-selected` | `selector` |

`text-selected` lo dispara el lapiz y abre el panel. `text-changed` viene de la
edicion en linea y solo se emite si el contenido cambio de verdad.

En `set-color`, `fill` y `colorEnd` son opcionales: sin ellos se aplica color
solido, que es como se comportaban las versiones anteriores.

## Persistencia

Los cambios son en vivo y viven en el DOM del iframe hasta recargar. Guardarlos
es responsabilidad del editor: hoy los textos del sitio se hidratan desde la
tabla `hydrate`, pero IMIN todavia no escribe en ella desde el bridge. Falta
mapear el `selector` CSS que reporta el bridge a la key de contenido.
