/**
 * IMIN editor bridge — se instala en refautomex.com (el sitio hijo).
 *
 * Recibe comandos por postMessage desde el editor IMIN (la app padre que
 * incrusta este sitio en un <iframe>) y aplica edicion en vivo:
 *   - modo "navigate": no hace nada, el sitio navega normal.
 *   - modo "text": bloquea la navegacion y hace contentEditable el texto que
 *     se clickee; devuelve los cambios al editor.
 *   - modo "image": bloquea la navegacion; al clickear una imagen avisa al
 *     editor, que responde con "set-image" para reemplazar el src.
 *
 * El scroll nunca se bloquea. Solo se activa cuando la pagina esta dentro de
 * un iframe, asi que no afecta a los visitantes normales.
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
    "http://127.0.0.1:3000",
    // 2) Produccion: reemplaza por el dominio real donde despliegues el editor
    //    IMIN (este proyecto). Ejemplo: "https://imin.tudominio.com".
    //    Puedes dejar tambien los de localhost sin problema.
    // "https://TU-DOMINIO-DEL-EDITOR",
  ];

  var mode = "navigate";
  var parentOrigin = null;
  var currentEditable = null;
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

  function clearEditable() {
    if (currentEditable) {
      currentEditable.removeAttribute("contenteditable");
      currentEditable.style.outline = "";
      currentEditable = null;
    }
  }

  function sendTextChange(el) {
    post({ type: "text-changed", selector: cssPath(el), value: el.textContent || "" });
  }

  function findImage(el) {
    while (el && el !== document.body) {
      if (el.tagName === "IMG") {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function onClickCapture(event) {
    if (mode === "navigate") {
      return;
    }

    var target = event.target;

    if (mode === "text") {
      // Permite mover el cursor / escribir dentro del campo ya activo.
      if (target && target.isContentEditable) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      clearEditable();

      if (target && target.nodeType === 1) {
        target.setAttribute("contenteditable", "true");
        target.style.outline = "2px solid #589bf9";
        currentEditable = target;
        target.focus();
        post({ type: "text-selected", selector: cssPath(target), value: target.textContent || "" });
      }

      return;
    }

    if (mode === "image") {
      event.preventDefault();
      event.stopImmediatePropagation();

      var img = findImage(target);
      if (img) {
        post({ type: "image-selected", selector: cssPath(img) });
      }

      return;
    }
  }

  // Captura en fase de captura para ganarle al router SPA y a los <a>.
  document.addEventListener("click", onClickCapture, true);

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

      document.body.style.cursor =
        mode === "image" ? "copy" : mode === "text" ? "text" : "";
      return;
    }

    if (data.type === "set-image" && data.selector && data.src) {
      var el = document.querySelector(data.selector);
      if (el && el.tagName === "IMG") {
        el.removeAttribute("srcset");
        el.src = data.src;
      }
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
