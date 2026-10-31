# Bloom: estado del proyecto

Última actualización: 2026-10-31. Contexto general en `CLAUDE.md`; API de Bloom OS en `docs/API_BLOOM_OS.md`.

## Hecho
- Acceso unificado por teléfono (`/acceso`): clientes sin contraseña, personal con contraseña.
- Seguridad de acceso de clientes (RLS por cliente) aplicada en la base. Reversión: `~/Proyectos/bloom-2-backups/revertir-acceso-clientes.sql`.
- Pantalla de mesa para celular y tablet; formato argentino de precios.
- API interna `/api/os` para Bloom OS (lecturas y operaciones, token, registro e idempotencia).
- Tablas de proveedores, compras, pagos a proveedores y registro de la API aplicadas en la base.

## Pendientes
1. **Caja (apertura y cierre) a la base.** Hoy la apertura y la rendición de caja viven en el `localStorage` del navegador del POS: se pierden al cambiar de dispositivo o limpiar datos, y ni la API de Bloom OS ni los reportes las ven. Pasarlas a tablas de la base (turnos de caja con monto inicial, movimientos y cierre) y exponerlas en `/api/os/cash`.
2. **El POS de pantalla debe usar la misma lógica de servidor que la API.** `OrderSheet` cobra y cierra mesas desde el navegador (registro de pago, pedido por RPC con *fallback* y liberación de mesa), mientras que `/api/os` usa la función `execute_pos_agent_operation`. Son dos caminos distintos para lo mismo. Unificar: que el POS llame a un endpoint de servidor que use la misma función (incluyendo descuento, cuenta corriente y Factura C, que hoy la API no cubre).
3. Interfaz de proveedores y gastos en el dashboard de Bloom (hoy solo por la API).
4. POS conversacional.
5. Credenciales de Getnet para habilitar el pago online (el botón sigue en "Próximamente").
6. Tablas que el código usa pero no existen en la base: `reservations`, `pedidos_whatsapp`, `proveedores` (en español).
