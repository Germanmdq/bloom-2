# Vida de Perros — Guía del sistema

Veterinaria · Peluquería canina · Pet shop — *"Amor, cuidado y bienestar para ellos"*

Esta guía explica cómo está armada la plataforma y cómo se administra. Está escrita para la dueña del negocio y también para quien haga el mantenimiento técnico.

- **Tienda (clientes):** `/veterinaria`
- **Panel (dueña y equipo):** `/veterinaria/admin`

> **Estado actual: versión de prueba.** El catálogo y los precios son los **reales** del Excel (`catalogo_miri_fotos_en_plantilla.xlsx`). En cambio, clientes, mascotas, pedidos, turnos, reseñas, cupones y combos son **de ejemplo**: se ven con la etiqueta "Ejemplo" y se borran con un clic. Mientras no se conecte la base de datos, todo lo que se cambie queda guardado solo en el navegador donde se hizo. Ver el punto 18.

---

## 1. Arquitectura del proyecto

El módulo vive **dentro del proyecto existente** (el de Bloom Café) como una aplicación independiente. **No se modificó ni se borró nada de la cafetería.** Los únicos archivos compartidos que se tocaron son estos, con cambios mínimos:

| Archivo | Cambio |
|---|---|
| `proxy.ts` | Las páginas públicas de `/veterinaria` no consultan la sesión, así cargan más rápido. `/veterinaria/admin` queda protegido en modo Supabase. |
| `components/PWA/PWAProvider.tsx` e `InstallPrompt.tsx` | No registran el service worker ni muestran el aviso de instalación de la cafetería dentro de `/veterinaria`. |
| `next.config.ts` | Imágenes en AVIF/WebP y encabezado `Service-Worker-Allowed` para el service worker de la veterinaria. |
| `app/globals.css` | Colores de la marca Vida de Perros, como variables. |
| `app/robots.ts` | Nuevo. Excluye los paneles de Google y apunta al sitemap. |

```
lib/vet/
  config/business.ts        ← CONFIGURACIÓN CENTRAL (nombre, logo, contacto, horarios, colores)
  config/integrations.ts    ← variables de entorno (Google, Supabase, push, etc.)
  types.ts                  ← modelo de datos (productos, pedidos, turnos, mascotas…)
  catalog/                  ← catálogo real (products.json), categorías, servicios, configuración inicial
  demo/generate.ts          ← datos de EJEMPLO (clientes, pedidos, turnos…), separados de las pantallas
  domain/                   ← reglas de negocio puras y testeadas:
      pricing.ts              carrito, cupones, 2x1, envío, puntos
      availability.ts         horarios libres de turnos
      search.ts               buscador inteligente (sinónimos, errores de tipeo)
      recommendations.ts      "Combiná con", "Otros también compraron", "Volver a comprar"
      stock.ts                estados y movimientos de stock
      loyalty.ts              puntos y niveles internos
      automations.ts          recordatorios, cumpleaños, carritos, stock bajo
      stats.ts                estadísticas del panel
      whatsapp.ts             mensajes y enlaces de WhatsApp
      assistant.ts            asistente (sin diagnósticos médicos)
      permissions.ts          roles ADMIN / EMPLEADO / CLIENTE
  data/                     ← acceso a datos intercambiable:
      repository.ts           contrato común
      local-repository.ts     modo demo (navegador)
      supabase-repository.ts  modo real (PostgreSQL + seguridad por filas)
  client/                   ← estado en el navegador (carrito, sesión, analíticas, notificaciones)
  server/                   ← lectura del catálogo en el servidor (SEO) y helpers de API
  seo.ts                    ← datos estructurados Schema.org

app/veterinaria/(tienda)/…  ← páginas públicas
app/veterinaria/admin/…     ← panel de administración
app/api/veterinaria/…       ← rutas de servidor (pedidos, turnos, disponibilidad, lista de espera, asistente)
components/veterinaria/     ← componentes visuales (ui/, store/, admin/)
supabase/migrations/20260930120000_veterinaria_module.sql ← base de datos real
scripts/vet-import-catalog.mjs, scripts/vet-generate-pwa-assets.mjs
tests/vet/                  ← pruebas automáticas de las reglas de negocio
```

**Recorridos del cliente:**

- **Compra:** Inicio → Categoría → Producto → Carrito → Compra → Entrega → Pedido. El pedido tiene una página de seguimiento.
- **Turnos:** Inicio → Servicio → Turno → Confirmación. Si no hay horario, el cliente puede anotarse en la lista de espera.

## 2. Tecnologías utilizadas

- **Next.js 16 (App Router) + React 19 + TypeScript**: las mismas que ya usaba el proyecto.
- **Tailwind CSS 4**: diseño mobile-first con los colores de la marca.
- **Zustand**: estado del carrito, la sesión y los datos (ya estaba instalado).
- **Supabase (PostgreSQL, Auth, Storage, Realtime)**: base de datos real, preparada con la migración.
- **lucide-react**: íconos.
- **sonner**: avisos en pantalla.
- **Gráficos propios** livianos, sin librería.
- **sharp**: generación de íconos y splash de la PWA.
- **xlsx**: importación del catálogo desde Excel.
- **Pruebas:** `node --test`, sin dependencias nuevas.

No se agregó ninguna dependencia nueva al proyecto.

## 3. Cómo funciona la PWA

- **Manifest propio:** `/veterinaria/manifest.webmanifest`, generado desde la configuración central. Incluye nombre, colores, íconos, íconos *maskable* para Android, `start_url`, `scope` y accesos directos a Turnos, Tienda, Cuenta y Panel.
- **Service worker propio:** `public/veterinaria/sw.js`. Controla solo `/veterinaria` y no interfiere con la cafetería.
  - Las páginas cargan de la red primero y guardan copia para usarlas sin conexión.
  - Los archivos estáticos se guardan en caché.
  - Las imágenes se sirven desde caché y se actualizan en segundo plano.
  - Sin conexión se muestra `/veterinaria/offline.html`.
  - El panel de administración no se guarda en caché, por privacidad.
- **Instalación:**
  - **Android, Chrome y Edge (Windows/Mac):** a partir de la segunda visita aparece la invitación "Instalar la app", con el botón nativo.
  - **iPhone/iPad:** se muestran las instrucciones "Compartir → Agregar a inicio". También hay splash screens para los tamaños de iPhone y iPad.
- **Notificaciones:** el service worker ya maneja `push` y el clic en la notificación. Ver el punto 19.
- **Íconos:** `npm run vet:pwa-assets` los regenera desde el logo.
- El service worker se activa en producción (`npm run build && npm start`), no en `npm run dev`.

## 4. Cómo agregar productos

**Desde el panel (uno por uno):** Panel → **Productos y precios** → **Nuevo producto** (o el acceso rápido "➕ Nuevo producto" del inicio). Se cargan:

- Nombre, categoría, subcategoría, marca y presentación (peso o tamaño).
- Descripción y etiquetas para el buscador.
- Especies a las que está destinado.
- Imágenes: se suben desde el celular y se optimizan solas a WebP.
- Precio, precio anterior y descuento.
- Stock y stock mínimo.
- Código interno, SKU y código de barras.
- Si es visible, si es destacado y si se vende con asesoramiento.
- **Variantes:** por ejemplo, alimento 3 kg / 12 kg / 15 kg o talles, cada una con su precio, stock y SKU.

**Desde Excel (muchos a la vez):** completar la planilla con el mismo formato (`Código | Categoría | Subcategoría | Destinado a | Producto | Imagen | Enlace | Estado | Precio compra | Precio venta | Notas`) y correr:

```bash
npm run vet:import -- ruta/al/catalogo.xlsx
```

El script:

- Limpia los nombres (por ejemplo, quita "- Temu Argentina").
- Agrupa los talles como variantes: "Polar liso" quedó con los talles 0 a 10.
- Marca la farmacia como "venta con asesoramiento".
- Oculta la categoría "Otros accesorios · Por revisar" hasta que se revise.
- Genera dos archivos:
  - `lib/vet/catalog/products.json`: solo datos públicos.
  - `supabase/private/vet_catalog_import.sql`: incluye **costos y enlaces de proveedor**. **No se sube a git**, porque el repositorio es público.

## 5. Cómo modificar precios

- **Rápido, desde el celular:** Panel → Productos → se escribe el precio en la tarjeta del producto y se confirma con Enter o tocando afuera. Se guarda al instante.
- **Precio anterior, descuento y variantes:** se abre el producto (lápiz) → panel "Precio". "Crear descuento (%)" calcula el precio nuevo y deja el anterior tachado.
- **Precio vacío:** muestra "Consultar precio" con botón de WhatsApp.
- Solo el rol **ADMIN** puede cambiar precios. La base de datos también lo impide para el rol EMPLEADO.

## 6. Cómo modificar categorías

Panel → **Categorías**. Desde ahí se puede renombrar, cambiar la descripción (que ayuda al SEO), el ícono y el orden, y mostrar u ocultar cada categoría. También hay dos opciones por categoría:

- **Venta con asesoramiento:** los productos se consultan por WhatsApp en lugar de comprarse por carrito. Así está configurada la farmacia veterinaria.
- **Consumo frecuente:** activa "Volver a comprar" y los recordatorios de recompra.

## 7. Cómo administrar stock

Cada producto tiene **stock actual**, **stock mínimo** y un **estado**:

- 🟢 Disponible
- 🟡 Poco stock (el stock está en el mínimo o por debajo)
- 🔴 Sin stock (no se puede comprar)
- ⚪ Sin cargar (se vende con "disponibilidad a confirmar")

Hoy **ningún producto tiene stock cargado**, porque el Excel no lo trae. Para activar las alertas:

- **Rápido:** Panel → Productos → botones − / + o se escribe la cantidad.
- **Con historial:** Panel → **Stock** → se busca el producto (sirve también el código de barras) → **Entrada** (compra), **Salida** (rotura o uso interno) o **Ajuste** (conteo). Cada movimiento queda registrado con fecha, usuario y motivo.
- **Automático:**
  - Cada venta descuenta stock.
  - Cancelar un pedido lo repone.
- **Alertas:**
  - En el inicio del panel y en el filtro "⚠️ Poco o sin stock".
  - En Automatizaciones: "⚠️ El producto X tiene solamente 3 unidades".

## 8. Cómo administrar pedidos

Panel → **Pedidos**, o el ícono de pedidos de la barra inferior del celular, que muestra cuántos hay nuevos.

- **Estados:** 🆕 Nuevo · 💳 Pago pendiente · ✅ Pagado · 📦 Preparando · 🚚 En camino · 🏪 Listo para retirar · ✅ Entregado · ❌ Cancelado.
- Cada tarjeta tiene un botón **"Marcar …"** que avanza al siguiente estado con un toque.
- En el detalle se ve:
  - Cliente, teléfono, productos, cantidades y total.
  - Medio de pago, forma de entrega, dirección y observaciones.
  - Fecha e historial de estados.
- Desde el detalle también se puede **avisar al cliente por WhatsApp**, con un mensaje ya armado según el estado.
- **Nuevo pedido** carga ventas del local o de WhatsApp. Permite incluir productos de farmacia, porque se venden después de la consulta.
- Los **puntos** se acreditan al cliente cuando el pedido pasa a "Entregado".

## 9. Cómo administrar turnos

Panel → **Turnos**:

- **Agenda por día**, con un selector de fechas. En cada turno se puede:
  - Confirmar, marcar como completado o como "No asistió", o cancelar.
  - Escribir al cliente por WhatsApp o llamarlo.
- **Por confirmar:** todos los turnos pedidos online que están pendientes.
- **Lista de espera:** muestra el primer horario libre y el botón "Avisar" por WhatsApp.
- **Bloquear horario:** un día completo (feriados, vacaciones) o una hora puntual, para todos los servicios o para uno solo.
- **Nuevo turno:** para turnos pedidos por teléfono. Permite sobreturnos.

Los horarios libres se calculan solos a partir de la duración, los días, las franjas y la capacidad de cada servicio (Panel → **Servicios**), menos los turnos tomados y los bloqueos.

## 10. Cómo administrar clientes

Panel → **Clientes**:

- Se puede buscar por nombre, teléfono o email.
- Hay segmentos por nivel interno (Cliente nuevo, frecuente o VIP), "sin compras" y "aceptan promociones".
- La ficha de cada cliente incluye:
  - Datos de contacto y notas internas.
  - Mascotas e historial de pedidos.
  - Puntos, que se pueden sumar o restar a mano.
  - Nivel (automático o fijado a mano).
  - Consentimiento para recibir promociones.
- Los clientes se crean solos al comprar o reservar, identificados por su teléfono. También se pueden cargar a mano.
- Los **niveles son internos**: el cliente nunca ve un ranking.

## 11. Cómo administrar mascotas

Panel → **Mascotas**. Se puede filtrar por especie, ver los próximos cumpleaños (30 días) y editar cada ficha: nombre, dueño, especie, raza, sexo, fecha de nacimiento, peso y observaciones. El cliente también puede cargar y editar sus mascotas desde **Mi cuenta**, incluida la foto.

El modelo ya tiene lugar para **vacunas** y está preparado para sumar el historial de turnos, baños y peluquería de cada mascota.

## 12. Cómo crear promociones

Panel → **Promociones y combos** (o el acceso rápido "🎟️ Nueva promoción").

**Cupones y promociones:**

- **Tipos:** % de descuento, $ de descuento, envío gratis y 2x1.
- **Código:** con código, el cliente lo escribe en el carrito. Sin código, es una **promoción automática** que se aplica sola.
- **Condiciones:**
  - Fechas de inicio y de vencimiento.
  - Usos máximos y compra mínima.
  - Categorías o productos válidos.
  - Destinatarios: todos, primera compra, clientes que vuelven o VIP.
- **Visibilidad:** "Activa" y "Mostrar en la página de promociones".

**Combos:** se combinan productos y/o servicios con un precio especial. La tienda muestra "Precio individual / Precio combo / Ahorrás". Los combos que tienen servicios (por ejemplo, "Baño + corte de uñas") se **reservan** como turno.

**Fidelización** (Panel → Fidelización):

- Puntos: cuántos se suman cada cuántos pesos y cuánto vale un punto al canjearlo.
- Beneficios canjeables.
- Niveles internos con sus beneficios.

El cliente ve mensajes como "Tenés 850 puntos" y "Te faltan 150 puntos para…".

## 13. Cómo configurar WhatsApp

Panel → **Configuración** → "WhatsApp (con código de país)". Hoy está cargado `5491159772229`, que corresponde al **11-5977-2229**.

Con ese número funcionan todos los botones:

- "Consultar por WhatsApp", "Comprar por WhatsApp", "Consultar disponibilidad", "Necesito ayuda" y "Reservar turno".
- Enviar el carrito completo o el pedido confirmado.
- Recordatorios y avisos desde el panel.

Todos los mensajes salen ya escritos. Por ejemplo: "Hola, quiero consultar por el producto […]" o "Hola, quiero realizar este pedido: … Total: $…".

Los textos de los recordatorios se editan en Panel → **Automatizaciones → Reglas y mensajes**.

**WhatsApp Business API (a futuro):** el código tiene la interfaz `MessageSender` (`lib/vet/domain/whatsapp.ts`) y las reglas ya contemplan el canal `whatsapp_api`. Hace falta una cuenta de Meta Business y un token en el servidor. Ver el punto 19.

## 14. Cómo configurar la ubicación

Panel → **Configuración → Ubicación**:

- Calle, localidad, provincia y código postal.
- Link de Google Maps (opcional).
- **Latitud y longitud:** en Google Maps, clic derecho sobre el local → copiar coordenadas.
- Barrios o zonas que atienden, para el SEO local.

Con esos datos, la página **Ubicación** muestra el mapa y el botón **"Cómo llegar"**, que abre Google Maps o Apple Maps, y se publican los datos para Google. Con coordenadas y radios cargados en las zonas de envío, el cliente además puede **detectar su zona** en el checkout.

Mientras no haya dirección, la tienda muestra "Dirección a confirmar" y no inventa nada.

## 15. Cómo cambiar el logo

> El logo original solo llegó como imagen en la conversación, no como archivo. Hoy se usa un **isotipo provisorio** (huella con corazón) con los colores de la marca.

1. Guardar el logo original (PNG o SVG con fondo transparente) en `public/veterinaria/brand/` y poner su ruta en `logo` dentro de `lib/vet/config/business.ts`. Otra opción es subirlo desde Panel → Configuración → **Subir logo**.
2. Regenerar los íconos de la app instalada y el splash:
   ```bash
   npm run vet:pwa-assets -- public/veterinaria/brand/logo-original.png
   ```
3. Opcional: reemplazar también `public/veterinaria/brand/mark.svg`, el isotipo del encabezado.

## 16. Cómo configurar los datos del negocio

Hay **dos lugares**, y el segundo tiene prioridad sobre el primero:

1. `lib/vet/config/business.ts`: el **único archivo** con los datos del negocio en el código. Tiene nombre, logo, dirección, teléfono, WhatsApp, Instagram, email, horarios, coordenadas, redes, colores, medios de pago y datos para transferencia.
2. Panel → **Configuración**: lo mismo, pero editable desde el celular. Lo que se guarda ahí pisa lo del archivo.

Los **horarios** son de ejemplo, para que el sistema de turnos funcione. Mientras "Horarios confirmados" esté apagado, se muestran como "A confirmar" y no se publican en Google.

**Envíos** (Panel → Envíos):

- Retiro y/o envío a domicilio.
- Zonas con precio, envío gratis desde cierto monto y radio de cobertura.
- Envío gratis general.

Si una zona no tiene precio, se muestra "A coordinar".

## 17. Cómo funcionan las estadísticas

- **Inicio del panel:**
  - Ventas de hoy, de 7 días y de 30 días, con la variación contra el período anterior.
  - Ticket promedio y pedidos por atender.
  - Turnos de hoy y próximos, y alertas de stock.
  - Gráficos: ventas de los últimos 7 días, productos más vendidos, categorías con más ventas, clientes nuevos por semana y servicios más reservados.
  - Clientes nuevos y recurrentes, promociones activas y cumpleaños.
- **Estadísticas (7, 30 o 60 días):**
  - Ventas por día, productos más vendidos y ventas por categoría.
  - Servicios más reservados, medios de pago y clientes nuevos.
  - **Embudo de compra:** vistos → al carrito → inicio de compra → compras.
  - Lo más buscado, productos más vistos y clics en WhatsApp según el lugar.
  - Favoritos, cupones usados y carritos abandonados o recuperados.
- **Qué cuenta como venta:** los pedidos no cancelados (incluye "pago pendiente", para ver la demanda real).
- **Cómo se miden los eventos** (`lib/vet/client/analytics.ts`):
  - En modo demo, con los del navegador.
  - En modo real, con la tabla `vet_events`, que junta a todos los visitantes.
  - Si se configura el ID, también se envían a **Google Analytics 4**.

## 18. Qué partes necesitan backend

Todo el sistema funciona **ya** en modo demo, pero para operar de verdad se necesita la base de datos:

1. Crear o usar el proyecto de Supabase y ejecutar la migración `supabase/migrations/20260930120000_veterinaria_module.sql`. Crea:
   - Las tablas `vet_*`, separadas por entidad: productos, categorías, servicios, clientes, mascotas, pedidos, turnos, bloqueos, lista de espera, cupones, combos, zonas, reseñas, FAQ, movimientos de stock, carritos, eventos, configuración y suscripciones push.
   - Los **roles** y la seguridad por filas (RLS).
   - El bucket de imágenes `vet-media`.
   - Las categorías, servicios y FAQ iniciales.
2. Cargar los productos: `npm run vet:import -- catalogo.xlsx` y ejecutar `supabase/private/vet_catalog_import.sql`.
3. Dar acceso al panel: `insert into vet_staff (user_id, role, name) values ('<uuid>', 'ADMIN', 'Dueña');`. El rol puede ser `ADMIN` o `EMPLEADO`.
4. Configurar `NEXT_PUBLIC_VET_DATA_SOURCE=supabase`, `NEXT_PUBLIC_VET_SITE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (solo en el servidor). Ver `.env.veterinaria.example`.

**Con base de datos real:**

- Los pedidos, turnos y la lista de espera pasan por rutas de servidor (`/api/veterinaria/*`). El servidor **recalcula precios, cupones, stock y disponibilidad**: nadie puede alterar un total desde el navegador.
- Los cupones privados se validan en el servidor.
- Los costos y proveedores viven en `vet_product_costs`, visible solo para el personal.
- El panel se protege con inicio de sesión (el `/auth` existente) y la tabla `vet_staff`.
- Pedidos y turnos nuevos llegan en tiempo real.

**Permisos por rol:**

- **ADMIN:** modifica todo.
- **EMPLEADO:** pedidos, turnos, clientes, mascotas y stock. No puede cambiar precios ni la configuración.
- **CLIENTE:** su cuenta, sus mascotas, sus pedidos y sus turnos.

**Límites del modo demo (hoy):**

- Los datos quedan en un solo navegador.
- El "ingreso" del cliente es solo con el teléfono.
- El rol del panel se elige en pantalla.

Sirve para mostrar y probar, **no para operar**.

## 19. Qué partes están preparadas para futuras integraciones

| Integración | Qué ya existe | Qué falta |
|---|---|---|
| Supabase | Repositorio completo, migración, RLS, rutas de servidor, tiempo real | Ejecutar la migración y configurar las variables |
| WhatsApp Business API | Plantillas, reglas y canal `whatsapp_api`, interfaz `MessageSender` | Cuenta de Meta, token y un emisor en el servidor |
| Automatizaciones con envío solo | `computePendingActions()` calcula qué enviar hoy (turnos, cumpleaños, recompras, carritos, baño, desparasitación, lista de espera, seguimiento, stock) | Un cron (Supabase Scheduled Functions o Vercel Cron) que la llame y envíe |
| Notificaciones push | Service worker (`push` y clic), suscripción con VAPID, tabla `vet_push_subscriptions`, preferencias por tipo | Claves VAPID y un emisor `web-push` en el servidor |
| Email | Canal `email` en las reglas | Proveedor (Resend, SES, etc.) |
| Google Analytics | `track()` envía a gtag si hay ID | `NEXT_PUBLIC_VET_GA_ID` |
| Google Search Console | Meta de verificación, sitemap y robots | `NEXT_PUBLIC_VET_GOOGLE_SITE_VERIFICATION` |
| Google Maps | Mapa embebido, "Cómo llegar" y detección de zona | Dirección y coordenadas (opcional: API key) |
| Google Business Profile / Reviews | Reseñas con origen "google", `sameAs` y rating en Schema.org | URL del perfil y la sincronización de reseñas |
| Mercado Pago | Medio de pago, estado "Pago pendiente" y el SDK ya instalado en el proyecto | Token y la ruta de preferencia de pago para la veterinaria |
| Asistente con IA | Ruta `/api/veterinaria/assistant` con guardia médica previa y prompt de sistema | Elegir el proveedor (el proyecto ya tiene SDKs de Groq y Google) |
| Recomendaciones por ventas | "Otros clientes también compraron" a partir de pedidos | Con volumen, una vista materializada de pares de productos |
| Historia clínica | Campo `vaccines` en mascotas, historial de turnos por mascota | Pantallas de historia clínica |
| Login seguro de clientes | `userId` en clientes y RLS por usuario | Usar el `/auth` existente (teléfono o email) en modo Supabase |

## 20. Qué datos reales necesito cuando llegue el momento de poner la veterinaria en funcionamiento

**Ya recibidos:** nombre (Vida de Perros), rubros, frase, WhatsApp 11-5977-2229, Instagram @vdperros, colores y catálogo (506 filas).

**Pendientes:**

1. **Logo original en archivo** (PNG o SVG con fondo transparente). También sirve una versión cuadrada para el ícono de la app.
2. **Dirección exacta**, localidad, código postal y **coordenadas**. Además, los barrios o zonas que atienden.
3. **Horarios reales** de atención y de cada servicio: días, franjas y cuántos turnos en simultáneo.
4. **Precios de los servicios** (consulta, baño, peluquería, uñas, deslanado, higiene) y sus duraciones reales.
5. **Precios faltantes:** 229 productos no tienen precio de venta en el Excel. Además, hay que revisar **MIR-199 ($32)** y **MIR-200 ($38)**, que parecen errores de carga.
6. **Stock inicial** de cada producto y el stock mínimo deseado.
7. **Fotos de los productos.** Las miniaturas del Excel son de 90×47 px y no alcanzan para una tienda. También falta revisar la categoría **"Otros accesorios · Por revisar"** (56 productos, hoy ocultos).
8. **Zonas de envío** con precio, monto de envío gratis y radio.
9. **Medios de pago** aceptados y **datos para transferencia** (alias, CBU, titular). Si se va a cobrar online, la cuenta de Mercado Pago.
10. **Email** del negocio y otras redes (Facebook, TikTok).
11. **Reglas de fidelización:** cuántos puntos por compra y qué beneficios.
12. **Promociones y combos reales.** Los actuales son de ejemplo.
13. **Reseñas reales**, con permiso, o el link del Perfil de Empresa de Google.
14. **Textos finales** de las preguntas frecuentes (hoy son respuestas iniciales para revisar).
15. **Dominio** del sitio, y cuentas de Google Analytics y Search Console.
16. **Usuarios del equipo:** quién es ADMIN y quién es EMPLEADO.
17. Cuando se quiera automatizar el envío: la cuenta de **WhatsApp Business API** y el proveedor de email.

---

### Comandos útiles

```bash
npm run dev                  # desarrollo (http://localhost:3000/veterinaria)
npm run test:vet             # pruebas de reglas de negocio
npm run vet:import -- x.xlsx # importar catálogo
npm run vet:pwa-assets       # regenerar íconos/splash de la app
npm run build && npm start   # producción (activa el service worker)
```

### Antes de publicar

- [ ] Panel → Configuración → **Borrar datos de ejemplo**, o arrancar directo en modo Supabase: la migración no trae datos de ejemplo.
- [ ] Revisar y activar las promociones reales.
- [ ] Confirmar los horarios ("Horarios confirmados").
- [ ] Cargar dirección, coordenadas y logo original.
- [ ] Configurar el dominio (`NEXT_PUBLIC_VET_SITE_URL`) y enviar `/veterinaria/sitemap.xml` a Google Search Console.
