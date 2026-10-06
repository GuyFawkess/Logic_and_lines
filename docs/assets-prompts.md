# Assets Prompts — Dirección C "La Línea Maestra"

> Ejecutar en OpenWork + fal.ai (regla doble-tier: draft barato → validar → final). Yo ejecuto los prompts y devuelvo las imágenes; mientras, la web usa marcadores `TODO-ASSET`.
> **Paleta bloqueada (main):** petróleo `#0D1A1F` · superficie `#16262E` · marfil `#FEF7EA` · marfil apagado `#B3AA9A` · ámbar `#E5A525` (hover `#F0B83A`).
> **Reglas:** sin texto incrustado, logos ni personas reconocibles · sin look IA genérico (neón, circuitos, robots) · coherencia entre recursos vía style preamble compartido · dimensiones explícitas · `width`/`height` intrínsecos + `srcset` para evitar CLS.
> **Principio de la dirección: presupuesto de imágenes MÍNIMO** — la fuerza es tipografía + línea (SVG en código, jamás imagen). Solo 2 recursos generados.

### [LL-C-01] grain-petroleo — textura de grano
- Uso: overlay sutil (4–5% de opacidad) sobre fondos petróleo para evitar banding en pantallas reales; tileable
- Formato: 512×512 px, PNG, tileable (seamless), sin transparencia
- Prompt: `Extreme close-up photograph of fine photographic film grain on a very dark teal-slate surface (hex #0D1A1F), monochrome warm-neutral silver-halide crystals, subtle, evenly distributed noise, seamless tileable texture, flat and uniform, no objects, no edges`
- Negative prompt: `text, letters, logos, lines, shapes, objects, vignette, gradient bands, large dust particles, scratches, color noise, purple, blue, bright spots`
- Estilo/coherencia: monocromo cálido sobre petróleo; densidad BAJA (debe quedar por debajo del 5% de opacidad aplicada); mismo grano en toda la web
- Variantes a generar: 2
- Ruta final: `/public/img/grain-petroleo.png`
- Prioridad de carga: lazy

### [LL-C-02] linea-tensa-pico — imagen del acto pico (OPCIONAL, solo si F1/F5 la pide)
- Uso: fondo del acto pico (cierre/booking): una línea ámbar tensa cruzando el vacío petróleo
- Formato: 16:9 · final 2400×1350 (servir 1920w/1200w/768w) · AVIF + WebP · sin transparencia
- Prompt: `Abstract minimalist long-exposure photograph: a single thin warm amber light streak (hex #E5A525) crossing a pitch-dark petrol-teal void (hex #0D1A1F), perfectly straight, delicate tension, subtle film grain, vast negative space, cinematic stillness, no other elements`
- Negative prompt: `text, logos, people, machines, circuit boards, neon glow, purple, blue, lens flare, bokeh balls, multiple lines, thick beams`
- Estilo/coherencia: mismo grano que LL-C-01; la línea debe quedar FINA (≤2% de la altura del cuadro) — si sale gruesa, descartar
- Variantes a generar: 3
- Ruta final: `/public/img/linea-tensa-pico.avif` (+ `.webp`)
- Prioridad de carga: lazy

### Sin prompt (composición en código — NO van por fal.ai)
- **og-image (1200×630):** se compone en F5 con un script (chromium) usando los tokens reales + `logoSolo.svg`. Nada de texto horneado en imágenes generadas.
- **Imágenes de servicio ×6:** se REUTILIZAN las webp reales existentes (`public/<servicio>/...`), con `width`/`height` intrínsecos.
- **Retrato:** `public/aboutPic.webp` existente, o ninguno (no se generan retratos sintéticos).
- **La Línea Maestra:** SVG nativo en código. Jamás imagen.
