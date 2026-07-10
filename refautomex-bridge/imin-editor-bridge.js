/**
 * IMIN editor bridge — se instala en refautomex.com (el sitio hijo).
 *
 * Recibe comandos por postMessage desde el editor IMIN (la app padre que
 * incrusta este sitio en un <iframe>) y aplica edicion en vivo:
 *   - modo "navigate": no hace nada, el sitio navega normal.
 *   - modo "text": bloquea la navegacion y hace contentEditable SOLO el texto
 *     que ya existe (no deja crear texto donde no lo hay); devuelve los cambios.
 *   - modo "media": bloquea la navegacion; al clickear una imagen (foreground o
 *     background) o un video avisa al editor con el "kind", que responde con
 *     "set-media" para reemplazar la fuente. Los videos solo aceptan mp4.
 *   - modo "style": bloquea la navegacion; al clickear un icono avisa
 *     "icon-selected" (el editor responde "set-icon" con el SVG nuevo) y al
 *     clickear cualquier otro elemento avisa "color-selected" (el editor
 *     responde "set-color" para pintar texto o fondo).
 *
 * El scroll nunca se bloquea (no interceptamos wheel/touch). Solo se activa
 * cuando la pagina esta dentro de un iframe, asi que no afecta a visitantes.
 *
 * Seguridad: solo acepta mensajes de los origenes en ALLOWED_PARENT_ORIGINS.
 * Agrega ahi el origen donde despliegues el editor IMIN.
 */
(function () {
  "use strict";

  // Solo actuar cuando el sitio se ve dentro de un iframe (el editor).
  if (window.self === window.top) {
    return;
  }

  var ALLOWED_PARENT_ORIGINS = [
    // 1) Pruebas: el editor IMIN corriendo en tu localhost.
    "http://localhost:3000",
    // 2) Produccion: reemplaza por el dominio real donde despliegues el editor
    "https://appstracts.netlify.app",
  ];

  var HOVER_OUTLINE = "2px dashed #589bf9";
  var ACTIVE_OUTLINE = "2px solid #589bf9";

  var mode = "navigate";
  var parentOrigin = null;
  var currentEditable = null;
  var hoverEl = null;
  var sendTimer = null;

  function isAllowed(origin) {
    return ALLOWED_PARENT_ORIGINS.indexOf(origin) !== -1;
  }

  // Ruta CSS estable-ish para identificar el elemento entre padre e hijo.
  function cssPath(el) {
    if (!el || el.nodeType !== 1) {
      return "";
    }

    var path = [];

    while (el && el.nodeType === 1 && el !== document.body) {
      var selector = el.nodeName.toLowerCase();
      var parent = el.parentNode;

      if (parent && parent.children) {
        var sameTag = Array.prototype.filter.call(parent.children, function (child) {
          return child.nodeName === el.nodeName;
        });

        if (sameTag.length > 1) {
          selector += ":nth-of-type(" + (Array.prototype.indexOf.call(sameTag, el) + 1) + ")";
        }
      }

      path.unshift(selector);
      el = parent;
    }

    return path.join(" > ");
  }

  function post(message) {
    if (!parentOrigin) {
      return;
    }

    var payload = { source: "refautomex-bridge" };

    for (var key in message) {
      if (Object.prototype.hasOwnProperty.call(message, key)) {
        payload[key] = message[key];
      }
    }

    window.parent.postMessage(payload, parentOrigin);
  }

  // --- Deteccion de "donde SI se puede editar" -----------------------------

  // Verdadero si el elemento tiene texto propio (un nodo de texto directo con
  // contenido). Asi no convertimos en editable un contenedor vacio.
  function hasDirectText(el) {
    if (!el || el.nodeType !== 1) {
      return false;
    }

    var tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
      return false;
    }

    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim() !== "") {
        return true;
      }
    }

    return false;
  }

  // Sube desde el elemento clickeado hasta encontrar uno con texto propio.
  function findTextEl(el) {
    while (el && el !== document.body) {
      if (hasDirectText(el)) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  // Verdadero si el elemento pinta una imagen de fondo (url(...)).
  function hasBackgroundImage(el) {
    if (!el || el.nodeType !== 1) {
      return false;
    }
    var bg = window.getComputedStyle(el).backgroundImage;
    return !!bg && bg !== "none" && bg.indexOf("url(") !== -1;
  }

  // Sube desde el elemento clickeado hasta encontrar un medio reemplazable:
  // una imagen <img>, un <video>, o un fondo con background-image.
  function findMedia(el) {
    while (el && el !== document.body) {
      if (el.nodeType === 1) {
        if (el.tagName === "IMG") {
          return { el: el, kind: "image" };
        }
        if (el.tagName === "VIDEO") {
          return { el: el, kind: "video" };
        }
        if (hasBackgroundImage(el)) {
          return { el: el, kind: "background" };
        }
      }
      el = el.parentElement;
    }
    return null;
  }

  // Sube desde el elemento clickeado hasta encontrar un icono: un <svg> inline
  // o un <i>/<span> con clases tipicas de fuentes de iconos (Font Awesome, etc).
  function findIcon(el) {
    while (el && el !== document.body) {
      if (el.nodeType === 1) {
        var tag = el.tagName ? el.tagName.toLowerCase() : "";
        if (tag === "svg") {
          return el;
        }
        if (
          (tag === "i" || tag === "span") &&
          typeof el.className === "string" &&
          /(^|\s)(fa|fas|far|fab|fa-|bi|bi-|icon|material-icons|glyphicon|material-symbols)/i.test(
            el.className,
          )
        ) {
          return el;
        }
      }
      el = el.parentElement;
    }
    return null;
  }

  // En modo "style", devuelve que se puede editar bajo el cursor: un icono
  // (para reemplazar) o cualquier elemento (para pintar color).
  function styleTargetUnder(target) {
    var icon = findIcon(target);
    if (icon) {
      return { el: icon, kind: "icon" };
    }
    if (target && target.nodeType === 1 && target !== document.body) {
      return { el: target, kind: "color" };
    }
    return null;
  }

  // Devuelve el elemento editable bajo el cursor segun el modo, o null.
  function editableUnder(target) {
    if (mode === "text") {
      return findTextEl(target);
    }
    if (mode === "media") {
      var media = findMedia(target);
      return media ? media.el : null;
    }
    if (mode === "style") {
      var styleTarget = styleTargetUnder(target);
      return styleTarget ? styleTarget.el : null;
    }
    return null;
  }

  // --- Resaltado por hover -------------------------------------------------

  function clearHover() {
    if (hoverEl && hoverEl !== currentEditable) {
      hoverEl.style.outline = "";
      hoverEl.style.outlineOffset = "";
    }
    hoverEl = null;
  }

  function setHover(el) {
    if (hoverEl === el) {
      return;
    }
    clearHover();
    if (el && el !== currentEditable) {
      el.style.outline = HOVER_OUTLINE;
      el.style.outlineOffset = "2px";
      hoverEl = el;
    }
  }

  // --- Edicion de texto ----------------------------------------------------

  function clearEditable() {
    if (currentEditable) {
      currentEditable.removeAttribute("contenteditable");
      currentEditable.style.outline = "";
      currentEditable.style.outlineOffset = "";
      currentEditable = null;
    }
  }

  function sendTextChange(el) {
    post({ type: "text-changed", selector: cssPath(el), value: el.textContent || "" });
  }

  // --- Bloqueo de navegacion ----------------------------------------------

  function isInsideEditable(node) {
    while (node) {
      if (node.nodeType === 1 && node.isContentEditable) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  // Bloquea eventos que disparan navegacion (routers SPA, <a>, botones que
  // navegan en mousedown, submits...). No toca wheel/touch, asi el scroll vive.
  function guardNavigation(event) {
    if (mode === "navigate") {
      return;
    }

    // En modo texto dejamos pasar todo lo que ocurre dentro del campo activo
    // (posicionar cursor, seleccionar, escribir).
    if (mode === "text" && isInsideEditable(event.target)) {
      return;
    }

    // No matamos el scroll tactil: solo bloqueamos el puntero tipo mouse.
    if (event.type === "pointerdown" && event.pointerType && event.pointerType !== "mouse") {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  ["pointerdown", "mousedown", "auxclick", "submit"].forEach(function (type) {
    document.addEventListener(type, guardNavigation, true);
  });

  // --- Click: selecciona el elemento a editar ------------------------------

  function onClickCapture(event) {
    if (mode === "navigate") {
      return;
    }

    var target = event.target;

    if (mode === "text") {
      // Permite mover el cursor / escribir dentro del campo ya activo.
      if (isInsideEditable(target)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      var textEl = findTextEl(target);

      // Sin texto propio => no se puede editar aqui (no creamos texto nuevo).
      if (!textEl) {
        clearEditable();
        return;
      }

      if (textEl === currentEditable) {
        return;
      }

      clearEditable();
      setHover(null);
      textEl.setAttribute("contenteditable", "true");
      textEl.style.outline = ACTIVE_OUTLINE;
      textEl.style.outlineOffset = "2px";
      currentEditable = textEl;
      textEl.focus();
      post({ type: "text-selected", selector: cssPath(textEl), value: textEl.textContent || "" });
      return;
    }

    if (mode === "media") {
      event.preventDefault();
      event.stopImmediatePropagation();

      var media = findMedia(target);

      // Sin medio reemplazable => no se puede agregar de mas.
      if (!media) {
        return;
      }

      post({ type: "media-selected", selector: cssPath(media.el), kind: media.kind });
      return;
    }

    if (mode === "style") {
      event.preventDefault();
      event.stopImmediatePropagation();

      var styleTarget = styleTargetUnder(target);
      if (!styleTarget) {
        return;
      }

      if (styleTarget.kind === "icon") {
        post({ type: "icon-selected", selector: cssPath(styleTarget.el) });
      } else {
        post({
          type: "color-selected",
          selector: cssPath(styleTarget.el),
          hasText: hasDirectText(styleTarget.el),
        });
      }
      return;
    }
  }

  // Captura en fase de captura para ganarle al router SPA y a los <a>.
  document.addEventListener("click", onClickCapture, true);

  // Hover: muestra donde SI se puede editar y marca "no permitido" donde no.
  document.addEventListener(
    "mousemove",
    function (event) {
      if (mode === "navigate") {
        setHover(null);
        return;
      }

      var editable = editableUnder(event.target);
      setHover(editable);

      document.body.style.cursor = editable
        ? mode === "media"
          ? "copy"
          : mode === "style"
            ? "pointer"
            : "text"
        : "not-allowed";
    },
    true,
  );

  document.addEventListener(
    "input",
    function (event) {
      if (mode !== "text" || !currentEditable || event.target !== currentEditable) {
        return;
      }

      if (sendTimer) {
        clearTimeout(sendTimer);
      }

      var el = currentEditable;
      sendTimer = setTimeout(function () {
        sendTextChange(el);
      }, 300);
    },
    true,
  );

  document.addEventListener(
    "blur",
    function (event) {
      if (currentEditable && event.target === currentEditable) {
        sendTextChange(currentEditable);
        clearEditable();
      }
    },
    true,
  );

  // --- Reemplazo de medios -------------------------------------------------

  function applyMedia(selector, kind, src) {
    var el = document.querySelector(selector);
    if (!el) {
      return;
    }

    if (kind === "image" && el.tagName === "IMG") {
      el.removeAttribute("srcset");
      el.src = src;
      return;
    }

    if (kind === "background") {
      // JSON.stringify envuelve en comillas y escapa el data URL de forma segura.
      el.style.backgroundImage = "url(" + JSON.stringify(src) + ")";
      return;
    }

    if (kind === "video" && el.tagName === "VIDEO") {
      // Quita los <source> hijos para que no ganen sobre el nuevo src.
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
      el.removeAttribute("srcset");
      el.src = src;
      el.load();
      return;
    }
  }

  // --- Estilo: color e iconos ---------------------------------------------

  function applyColor(selector, colorTarget, color) {
    var el = document.querySelector(selector);
    if (!el) {
      return;
    }
    if (colorTarget === "background") {
      el.style.backgroundColor = color;
    } else {
      el.style.color = color;
    }
  }

  function applyIcon(selector, svgMarkup) {
    var oldEl = document.querySelector(selector);
    if (!oldEl || !oldEl.parentNode) {
      return;
    }

    var tmp = document.createElement("div");
    tmp.innerHTML = svgMarkup;
    var newEl = tmp.firstElementChild;
    if (!newEl) {
      return;
    }

    // Conserva el tamano y color del icono original para que encaje visualmente.
    var cs = window.getComputedStyle(oldEl);
    newEl.style.width = cs.width;
    newEl.style.height = cs.height;
    newEl.style.color = cs.color;
    newEl.style.verticalAlign = cs.verticalAlign;

    oldEl.parentNode.replaceChild(newEl, oldEl);
  }

  window.addEventListener("message", function (event) {
    if (!isAllowed(event.origin)) {
      return;
    }

    var data = event.data;

    if (!data || data.source !== "imin-editor") {
      return;
    }

    parentOrigin = event.origin;

    if (data.type === "set-mode") {
      mode = data.mode || "navigate";

      if (mode !== "text") {
        clearEditable();
      }

      setHover(null);
      document.body.style.cursor =
        mode === "media"
          ? "copy"
          : mode === "text"
            ? "text"
            : mode === "style"
              ? "pointer"
              : "";
      return;
    }

    if (data.type === "set-media" && data.selector && data.kind && data.src) {
      applyMedia(data.selector, data.kind, data.src);
      return;
    }

    if (data.type === "set-color" && data.selector && data.color) {
      applyColor(data.selector, data.colorTarget, data.color);
      return;
    }

    if (data.type === "set-icon" && data.selector && data.svg) {
      applyIcon(data.selector, data.svg);
      return;
    }
  });

  // Anuncia disponibilidad a cualquiera de los origenes permitidos.
  ALLOWED_PARENT_ORIGINS.forEach(function (origin) {
    try {
      window.parent.postMessage({ source: "refautomex-bridge", type: "ready" }, origin);
    } catch (error) {
      /* origen no disponible, se ignora */
    }
  });
})();
