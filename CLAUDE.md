# Bloom

Café: POS para el local + carta pública y cuenta de clientes. Los mensajes del dueño son en español rioplatense.

## Stack
- Next.js (App Router) en Vercel + Supabase (proyecto `zcgctaqzqcpqopforttc`).
- Producción: https://bloom-2-drab.vercel.app (rama `main` = producción).
- No migramos a Cloudflare.

## Forma de trabajo
- Cada cambio terminado se despliega a producción: mergear a `main` y verificar que el deploy de Vercel quede en Ready.
- Antes de desplegar tienen que pasar build, tsc y tests (`npm run build`, `npx tsc --noEmit`, `node --test lib/phone.test.mjs lib/getnet.test.mjs lib/agent/core.test.mjs lib/agent/order.test.mjs lib/os/core.test.mjs`). Si algo falla, no desplegar y avisar.
- Nunca correr migraciones SQL ni modificar o borrar datos reales sin aprobación explícita del dueño.
- Nunca imprimir ni guardar la clave `service_role` ni otros secretos; las credenciales van solo en variables de entorno de Vercel.

## Acceso
- Una sola entrada: `/acceso`, por teléfono.
- Clientes entran sin contraseña; el staff (ADMIN, MANAGER, WAITER, KITCHEN) entra con contraseña (`/api/auth/staff-login`).
- Admin: teléfono 2236151152. La contraseña se cambia en `/dashboard/password`.

## No tocar
- Colores verde, amarillo y rojo de las tarjetas de mesas (`app/dashboard/tables/page.tsx`).
- Atajos F1–F12 del POS en computadora (`components/dashboard/OrderSheet.tsx`).
- Precios en formato argentino ($8.000): usar `lib/format.ts`, y `toLocaleString('es-AR')`.

## API para Bloom OS
- `/api/os/...` (token `BLOOM_OS_API_TOKEN`, nunca en código). Documentación en `docs/API_BLOOM_OS.md`. Las escrituras dependen de la migración `20261031000000_proveedores_gastos_os.sql` (sin ejecutar, espera aprobación).

## Pagos
- Getnet: pendiente de credenciales. El botón de pago online queda en "Próximamente".

## Cloudflare OS
- En paralelo se evalúa Cloudflare OS en `~/Proyectos/bloom-os` como capa de consultas y operación sobre Bloom. Bloom sigue siendo el sistema principal.

## Pendientes
- Migración de seguridad `supabase/migrations/20261027000000_acceso_clientes.sql` (sin ejecutar, espera aprobación).
- Módulo de proveedores y gastos.
- POS conversacional.
