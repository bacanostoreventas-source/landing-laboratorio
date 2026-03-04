# CLAUDE.md — landing-laboratorio

## Contexto del proyecto

**Producto:** Guía de Interpretación de Exámenes de Laboratorio
**Precio:** S/ 10.00 PEN
**Audiencia:** Estudiantes y profesionales de salud en Perú
**Hosting:** Vercel (deploy automático en push a `main`)
**URL:** landing-laboratorio.vercel.app

Infoproducto estático (landing de conversión + serverless functions). No hay framework JS — HTML/CSS/JS vanilla puro.

---

## Estructura del proyecto

```
landing-laboratorio/
├── index.html              # Landing principal (2,172 líneas) — página de conversión
├── venta-directa.html      # Landing alternativa compacta (1,237 líneas)
├── gracias.html            # Confirmación post-compra, dispara evento Purchase (357 líneas)
├── vercel.json             # cleanUrls: true
├── api/
│   ├── purchase.js         # POST /api/purchase — registro manual de venta en Meta CAPI
│   └── track.js            # POST /api/track — relay browser → Meta CAPI server-side
├── admin/
│   └── venta.html          # Panel admin para registrar ventas manualmente (requiere ?key=)
└── img/
    ├── bonus/              # 4 imágenes de bonos
    ├── preview/            # 6 previews de contenido del ebook
    ├── testimonios/        # 4 screenshots de testimonios de Facebook
    ├── portada.png         # Portada del ebook (hero principal)
    ├── logo.png
    ├── yape-qr.png         # QR de pago Yape
    └── compra-{1,2,3}.jpg  # Instrucciones de flujo de compra
```

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 + CSS3 + JS vanilla |
| Backend | Vercel Serverless Functions (Node.js) |
| Hosting | Vercel (CDN global) |
| Tracking | Meta Pixel (browser) + Meta CAPI v19.0 (server) |
| Pagos | Yape QR + (posible MercadoPago) |
| Fuentes | Google Fonts (Inter) |
| Iconos | Font Awesome 6.5.0 CDN |
| Entrega | WhatsApp (links wa.me) |

---

## Variables de entorno

Configuradas en **Vercel Project Settings → Environment Variables** (nunca en código):

```
META_PIXEL_ID         = 960233036561751
META_ACCESS_TOKEN     = <token con permisos write a pixel>
ADMIN_KEY             = <clave aleatoria para panel admin>
```

No existe `.env.example` — documentar aquí cualquier variable nueva que se agregue.

---

## Flujos principales

### Flujo cliente (compra online)
```
index.html → [Lee contenido] → Click "Comprar"
→ Pasarela de pago (Yape/MercadoPago)
→ Redirecciona a gracias.html
→ Meta Pixel Purchase + CAPI Purchase (mismo event_id para deduplicación)
→ WhatsApp bot/manual envía PDF
```

### Flujo admin (registro manual de venta)
```
admin/venta.html?key=ADMIN_KEY
→ Click "Confirmar venta en Meta Ads"
→ POST /api/purchase {key}
→ Meta CAPI evento Purchase
→ Contador localStorage del día
```

---

## Sistema de tracking Meta (crítico)

El proyecto implementa **dual tracking** para atribución robusta:

1. **Browser Pixel** (`fbevents.js`) — captura cookies `fbp` + `fbc` del navegador
2. **Server-side CAPI** (`/api/track.js`) — captura IP real + User-Agent del servidor
3. **Mismo `event_id`** en ambos — Meta deduplica y no cuenta doble

### Eventos rastreados
| Evento | Dónde | Cuándo |
|---|---|---|
| `PageView` | index.html | Al cargar la página |
| `ViewContent` | index.html | Al ver landing |
| `InitiateCheckout` | index.html | Click en CTA de compra |
| `Purchase` | gracias.html | Post-compra (valor: 10.00 PEN) |
| `Purchase` | /api/purchase | Admin registra venta manual |

---

## Arquitectura de conversión

Las landing pages siguen el framework **Pain → Solution → Proof → CTA**:

- **Hero:** Headline + precio (S/ 10.00) + CTA + social proof
- **Pain Section:** 3 problemas comunes del target
- **Solution:** 5 beneficios de la guía
- **Contents:** 4 módulos (Hematología, Bioquímica, Cardiología, Urología)
- **Bonus:** 4 bonos incluidos
- **Testimonials:** Screenshots de Facebook
- **FAQ + CTA final**

### Elementos de urgencia/confianza en uso
- Badge de viewers en tiempo real (geolocalización por IP)
- Contador de copias vendidas
- Trust items (entrega 5 min, acceso infinito, precio especial)
- Avatares de compradores recientes

---

## Reglas de trabajo

- **Nunca tocar las variables de entorno en código** — solo en Vercel dashboard
- **Nunca commitear `.vercel/`** — está en .gitignore, contiene datos de proyecto privados
- **Probar cambios de CAPI localmente** es difícil; verificar en Meta Events Manager
- **ADMIN_KEY** nunca debe aparecer en código fuente ni commits
- Los archivos HTML son grandes (hasta 2,172 líneas) — editar con cuidado secciones específicas
- Vercel deploy es automático en push a `main`

---

## API endpoints

### `POST /api/track`
Relay browser → Meta CAPI. Llamado desde el navegador en eventos importantes.

```js
// Body esperado:
{
  event_name: "Purchase" | "InitiateCheckout" | "ViewContent" | "Lead" | "PageView",
  event_id: "string-unico",
  fbp: "cookie_fbp",        // opcional
  fbc: "cookie_fbc",        // opcional
  user_agent: "string",
  page_url: "https://..."
}
```

### `POST /api/purchase`
Registro manual de venta desde panel admin.

```js
// Body esperado:
{
  key: "ADMIN_KEY"
}
// Responde: { success: true } o { error: "Invalid key" }
```

---

## Consideraciones de seguridad

- CORS abierto (`*`) en ambas APIs — revisar si se quiere restringir a dominio propio
- `ADMIN_KEY` debe ser lo suficientemente larga y aleatoria (mínimo 32 chars)
- `META_ACCESS_TOKEN` tiene permisos de escritura al pixel — rotar si se compromete
- El panel admin valida `key` en cada request; no hay sesión/cookie

---

## Optimizaciones pendientes

| Tarea | Impacto | Esfuerzo |
|---|---|---|
| Comprimir imágenes a WebP | Performance (imágenes suman ~6.5 MB) | Bajo |
| Lazy loading explícito en imágenes | LCP / Core Web Vitals | Muy bajo |
| `.env.example` documentado | DX | Muy bajo |
| Agregar `og:image` y tags Open Graph completos | SEO / compartir en redes | Bajo |
| A/B test entre index.html y venta-directa.html | Conversión | Medio |

---

## Historial de cambios relevantes

| Commit | Cambio |
|---|---|
| `894dc4f` | Funnel completo Meta Pixel + CAPI |
| `7ab75ea` | Geolocalización por IP en badge de viewers |
| `9379dba` | Testimonios de Facebook en venta-directa |
| `359b5ec` | Página de gracias con Purchase event |
