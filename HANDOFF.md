# HANDOFF — Logic & Lines Web

## 1. Resumen de la sesion

**Fecha:** 2026-08-19 (continuacion)
**Proyecto:** Logic & Lines — landing page web
**Estado:** Bloques 1, 3, 4 y 5 completados. Bloque 2 (Cal.com) saltado. Pendiente config GTM (companera) + URL de Facebook.

Se completaron los bloques 3 (Email CTA fix) y 4 (SEO técnico) planificados en la sesión anterior. Se corrigieron emails rotos, se añadió Instagram visible, se implementaron schemas JSON-LD en home y contacto, se arregló hreflang, se añadieron descriptions y alt texts. Build Astro exitoso (22 páginas). QA final PASS.

---

## 2. Stack

- **Framework:** Astro 5.7.10 con output server + `@astrojs/node` adapter
- **Estilos:** Tailwind CSS v4 + daisyUI
- **i18n:** Manual (archivos `src/i18n/translations/es.js` y `en.js`)
- **Tracking:** Google Tag Manager + Meta Pixel + Conversions API (CAPI)
- **Deploy:** Coolify en VPS Hostinger (imagen Docker)
- **Graphify:** `graphify-out/` con grafo de conocimiento del proyecto

---

## 3. Sesion 2026-07-29 — Bloques 3 y 4

### Bloque 3 — Email CTA fix (completado)

- Email corregido a `logicandlinestudios@gmail.com` en `src/pages/contact.astro` y `src/pages/en/contact.astro`.
- Eliminadas todas las referencias a "Malai Thai Massage" en `src/pages/en/contact.astro` (texto hardcodeado reemplazado por traducciones `t.contact.*`).
- Añadido Instagram visible con URL `https://www.instagram.com/logic_and_lines/?hl=en` en ambas páginas.
- Facebook añadido pero oculto (sin URL aun); comentario `<!-- TODO: anadir URL de Facebook -->`.
- Fallback de portapapeles añadido en el script de contacto (`navigator.clipboard.writeText` en clic de mailto).
- Añadidas claves `seo.contactTitle` y `seo.contactDescription` en `src/i18n/translations/es.js` y `en.js`.
- Añadidos schemas `ContactPage` JSON-LD en `contact.astro` y `en/contact.astro`.

### Bloque 4 — SEO tecnico (completado)

- Home ES/EN (`src/pages/index.astro`, `src/pages/en/index.astro`): schemas `WebSite` y `Organization`, H1 `sr-only`, title/descriptions unicos por idioma (`Agencia de Marketing y Automatizacion con IA | Logic & Lines` / `AI Automation Agency | Logic & Lines`).
- `src/components/Header.astro`: alt texts corregidos.
- `src/components/Opinion.astro`: alt descriptivo añadido.
- `src/layouts/Layout.astro`: hreflang corregido usando `getAlternateURLs` de `src/i18n/utils.js`, self-referencing hreflang añadido.
- `src/i18n/utils.js`: soporte para pares de rutas con slugs diferentes (`/politica-de-privacidad` ↔ `/en/privacy-policy`).
- `src/pages/politica-de-privacidad.astro` y `src/pages/en/privacy-policy.astro`: descriptions añadidas.
- `src/pages/service/[id].astro` y `src/pages/en/service/[id].astro`: descriptions añadidas; schema `Service` añadido en la version EN (la ES ya lo tenia).
- Titulos/descriptions de contacto ES/EN ajustados.
- H1 unico verificado en todas las paginas.
- Facebook eliminado de `sameAs` en Organization schema hasta que la pagina exista.

### Build y QA

- `pnpm run build` exitoso (22 paginas prerenderizadas).
- QA final: PASS. Sin `malaithai`, sin `Malai Thai`, sin `href=""`, hreflang correcto, JSON-LD parseable.

---

## 3.5 Sesion 2026-08-19 — Bloque 5 CMP/cookies (completado)

Cookiebot + Google Consent Mode v2 integrados y pusheados (commit `8cff8d3`, deploy automatico Coolify):

- Nuevo componente `src/components/layout/CookiebotConsent.astro`: consent default todo `denied` + `ads_data_redaction`/`url_passthrough` + listeners `CookiebotOnAccept`/`CookiebotOnConsentUpdate` con `gtag('consent','update')`; script CMP con `data-cbid=03f4ee6e-764b-44af-a746-68e8fab1ec60` y `data-blockingmode="auto"`; env `COOKIEBOT_ID` opcional.
- Insertado en `<head>` ANTES de GTM en `Layout.astro` y `en/landing-lead.astro`.
- `MetaPixel.astro`: gateo con `window.hasConsentFor('marketing')` en `trackMetaEvent` y `sendToMetaCAPI`; helpers con `data-cookieconsent="ignore"`.
- Footer + i18n ES/EN: enlace "Configuracion de cookies" / "Cookie Settings" (`Cookiebot.renew()`).
- Build OK (22 paginas). Verificado que el script de consent + CMP salen en el HTML generado en el orden correcto.

### Pendiente: configuracion GTM (companera)

1. Crear trigger custom event `cookie_consent_update`.
2. Tag Meta Pixel: "Require additional consent" con `ad_storage` + trigger `cookie_consent_update` (en vez de All Pages).
3. Tags de Google (GA4/Ads/Conversion Linker): NO tocar (Advanced Consent Mode).
4. Scan nuevo del dominio en Cookiebot para categorizar GTM/Pixel.
5. Verificar en Tag Assistant que con consent denegado el Pixel no carga y el CAPI no envia.

## 4. Historico — Sesion anterior (2026-07-29, bloque 1 + ajustes)

### Graphify
- Instalado y ejecutado graphify sobre el proyecto.
- Output en `graphify-out/`: `graph.html`, `GRAPH_REPORT.md`, `graph.json`, cache AST.
- 233 nodos, 285 aristas, 38 comunidades detectadas.

### FAQ en navbar
- Claves `nav.faq` anadidas a las traducciones (`es.js` y `en.js`).
- Enlace FAQ anadido en Header.astro tanto en escritorio (linea 75) como en movil (linea 161).
- Seccion `id="faq"` anadida en FAQ.astro (linea 35).

### Unificacion estetica de CTAs de agendar llamada
- Los botones de agendar llamada en paginas de servicio ahora usan el mismo estilo que el hero: `BookButton.astro` con clases `flex`, `w-fit mx-auto`, sombra gold y hover consistente.
- Se eliminaron variaciones redundantes de CTA en paginas de servicio.

### Hero
- Titulo movil subido (`font-size: clamp(2rem, 10vw, 4rem)` con `translateY(-2rem)` en `max-width: 768px`).
- CTA y flecha de scroll dentro de cada panel, con colores que cambian segun el panel:
  - Panel izquierdo (fondo oscuro): flecha gold (`text-(--color-primary)`).
  - Panel derecho (fondo gold): flecha oscura (`text-(--color-bg)`).
- Flechas posicionadas a `bottom-[15%]` para evitar superposicion con el header sticky.

### Evento `generated_lead`
- `dataLayer.push({ event: 'generated_lead' })` anadido en `thankyou.astro` (linea 750).
- Listener `bookingSuccessful` de Cal.com en `Booking.astro` (linea 103) que dispare el mismo evento.

### Correccion de `baseUrl` invertido en BookButton.astro
- `BookButton.astro` ahora usa `flex` + `w-fit mx-auto` para centrado correcto.
- `baseUrl` corregido: condicional `currentLang === "en" ? "/en/" : "/"` para que los enlaces `#booking` funcionen con el prefijo de idioma correcto.

### Limpieza
- Codigo comentado eliminado (bloques de parrafos AEO, gradient fade comentados en Hero.astro).
- Clases CSS rotas o no utilizadas corregidas.

### Header CTA desktop
- Boton CTA del header en escritorio ajustado a `px-7 py-2.5 text-sm` (linea 85 de Header.astro).

---

## 5. Decisiones

### Bloque 2 (Cal.com) — Saltado
No se implementaron cambios en la integracion de Cal.com. Queda documentado:

- El enlace de thankyou actual es `https://logicandlines.com/thankyou`.
- Se recomienda cambiar el slug del evento en Cal.com (actualmente `1ª-llamada-de-evaluacion` con caracteres especiales) por uno sin caracteres especiales (ej. `llamada-evaluacion`).
- El enlace `data-cal-link` en Booking.astro usa este slug, por lo que cualquier cambio debe reflejarse ahí.

### Facebook — Pendiente de URL
Facebook se ha dejado fuera de `Organization.sameAs` hasta que el usuario proporcione la URL de la pagina de Facebook. Cuando esté disponible, actualizar:
- `src/pages/contact.astro` y `src/pages/en/contact.astro` (icono + enlace)
- Footer
- Schema `Organization.sameAs`

---

## 6. Pendientes (proxima sesion)

### Configuracion GTM (companera)
- Trigger `cookie_consent_update` + "Require additional consent" (`ad_storage`) en el tag del Meta Pixel.
- Tags de Google (GA4/Ads/Conversion Linker): no tocar.
- Scan nuevo del dominio en Cookiebot.
- Verificar con Tag Assistant el comportamiento con consent denegado/aceptado.

### Facebook URL
- Cuando el usuario proporcione la URL de Facebook: actualizar `contact.astro`, `en/contact.astro`, footer, `Organization.sameAs`.

### WhatsApp / footer placeholders
- Numeros placeholder `+34600000000` en Footer/Booking/StructuredData preexistentes; corregir cuando haya numero real.

### General
- Actualizar graphify tras los cambios: `graphify update .`

---

## 7. Notas / advertencias

- El slug actual de Cal.com (`1ª-llamada-de-evaluacion`) tiene caracteres especiales (tilde, guion, diéresis). Se recomienda cambiarlo por un slug limpio tipo `llamada-evaluacion` para evitar problemas de encoding.
- El listener `bookingSuccessful` usa la API oficial de Cal.com Embed. Verificar en produccion que el evento se dispare correctamente tras una reserva real.
- `BookButton.astro` usa `flex` + `w-fit mx-auto` para centrado. Si se usa en contextos donde el contenedor padre tiene `flex` con direccion distinta, verificar que se centre correctamente.
- El fallback de portapapeles en contacto (`navigator.clipboard.writeText`) puede no funcionar en algunos navegadores sin HTTPS. En localhost puede fallar silenciosamente.
- Los schemas `ContactPage` JSON-LD se añadieron tanto en la version ES como EN de contacto. Verificar en la Test Suite de Rich Results de Google tras el deploy.

---

## 8. Archivos clave tocados en esta sesion

```
src/pages/contact.astro
src/pages/en/contact.astro
src/pages/index.astro
src/pages/en/index.astro
src/pages/politica-de-privacidad.astro
src/pages/en/privacy-policy.astro
src/pages/service/[id].astro
src/pages/en/service/[id].astro
src/layouts/Layout.astro
src/components/Header.astro
src/components/Opinion.astro
src/i18n/translations/es.js
src/i18n/translations/en.js
src/i18n/utils.js
```

---

## 9. Proximo paso sugerido

**Bloque 5 (CMP/cookies) COMPLETADO** (Cookiebot + Consent Mode v2, commit `8cff8d3`, deploy en Coolify).

Siguiente:
- Dar a la companera las instrucciones de configuracion GTM (trigger `cookie_consent_update` + consent requerido en Meta Pixel; ver seccion 3.5).
- Verificar que el banner de cookies aparece en produccion.
- Cuando haya URL de Facebook, completar `contact.astro`, footer y `Organization.sameAs`.
