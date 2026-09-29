# Configuración de Mercado Pago para Producción

Para que los pagos online funcionen, necesitas configurar 2 variables de entorno en tu servidor (Vercel, etc.) o en tu archivo `.env.local`.

## 1. MP_ACCESS_TOKEN
Es la "llave" que conecta tu aplicación con tu cuenta de Mercado Pago.
- **Dónde conseguirlo:**
  1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel).
  2. Inicia sesión con tu cuenta de Mercado Pago (donde quieres recibir el dinero).
  3. Crea una "Aplicación" si no tienes una.
  4. Ve a "Credenciales de Producción" (en el menú lateral).
  5. Copia el **Access Token**. (Empieza con `APP_USR-...`).

## 2. NEXT_PUBLIC_URL
Es la dirección de tu sitio web. Mercado Pago necesita saber a dónde redirigir al cliente después de pagar.
- **Qué valor poner:**
  - Si estás probando en tu PC: `http://localhost:3000`
  - Si ya publicaste tu web: `https://tu-dominio.com` (ej: `https://bloom-cafe.vercel.app`).
  - **Importante:** No pongas una barra `/` al final.

---

## 3. Mercado Pago Point Smart (terminal N950, API Integration)

Para cobrar en el POS con el lector Point:

1. **`MERCADOPAGO_DEVICE_ID`** — ID del terminal en la API de Point. Debe existir en tu cuenta MP.
2. Obtener los IDs: con sesión de **admin del panel** (`isAdminEmail`), abrí en el navegador o con `curl`:

   `GET /api/payments/point-devices`

   La respuesta incluye `devices[].id` (ej. `PAX_...__...`). Copiá el que corresponda al N950.

3. Agregá en **`.env.local`** y en **Vercel**:

   ```bash
   MERCADOPAGO_DEVICE_ID=PAX_N950__TUN_ID_AQUI
   ```

4. **Sandbox Point** (solo pruebas): si MP te indica usar entorno de prueba del terminal:

   ```bash
   MERCADOPAGO_POINT_SANDBOX=true
   ```

   En producción no definas esa variable (o ponela en `false`).

El **access token** es el mismo que para Checkout (`MERCADOPAGO_ACCESS_TOKEN` o `MP_ACCESS_TOKEN`).

## Ejemplo de archivo .env.local

```bash
# Credenciales de Mercado Pago
MP_ACCESS_TOKEN=APP_USR-xxxx-xxxx-xxxx-xxxx

# Terminal Point (POS físico)
MERCADOPAGO_DEVICE_ID=PAX_N950__XXXXXXXX

# URL de tu sitio (sin barra al final)
NEXT_PUBLIC_URL=https://bloom-cafe.vercel.app
```

## Importante sobre Producción
Para cobrar dinero real, asegúrate de estar usando las **Credenciales de Producción** y no las de Prueba (Sandbox).
El Access Token de producción empieza con `APP_USR-`.
El de prueba empieza con `TEST-`.
