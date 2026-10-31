# API de Bloom para Bloom OS (`/api/os/...`)

API interna para que Bloom OS (Cloudflare OS, `~/Proyectos/bloom-os`) lea y opere el local.
Base: `https://bloom-2-drab.vercel.app/api/os`

## Estado

| Parte | Estado |
|---|---|
| Lecturas (mesas, pedidos, cocina, ventas, clientes, proveedores, gastos, caja) | **Disponibles** |
| Operaciones de escritura | **Bloqueadas hasta aplicar la migración** `supabase/migrations/20261031000000_proveedores_gastos_os.sql` (crea el registro/idempotencia y las tablas de compras y pagos a proveedores). Responden `503 migration_pending`. |
| Proveedores: compras y pagos, medio de pago de gastos | Necesitan la misma migración |

La migración **no se corrió**: espera aprobación del dueño.

## Autenticación

Token secreto en cada petición: `Authorization: Bearer <BLOOM_OS_API_TOKEN>` (o `X-Bloom-OS-Token`).
El token vive en la variable de entorno `BLOOM_OS_API_TOKEN` de Vercel y como secreto del gatekeeper Bloom en Bloom OS. No se escribe en código ni en logs.
Token inválido: `401`. Más de 20 intentos inválidos en 10 minutos desde una IP: `429`.

Cabeceras opcionales/obligatorias:

| Cabecera | Uso |
|---|---|
| `X-Bloom-OS-Actor` | Quién opera (ej. `bloom-os:german`). Se guarda en el registro. Por defecto `bloom-os`. |
| `Idempotency-Key` | **Obligatoria en todo POST.** 8–128 caracteres (`A-Za-z0-9_.:-`). Una UUID nueva por operación. |

## Formato

Éxito: `{ "data": ... }`. Error: `{ "error": { "code": "...", "message": "..." } }`.
Importes en pesos (número). Fechas `YYYY-MM-DD` en hora de Argentina; los períodos se cortan a las 00:00 de Argentina.

### Idempotencia y registro
- Cada POST se registra en `os_api_log` (actor, método, ruta, cuerpo, estado, respuesta, fecha).
- Repetir la misma `Idempotency-Key` con el mismo cuerpo devuelve la respuesta guardada (cabecera `Idempotent-Replay: true`) sin volver a operar.
- Misma clave con otro cuerpo: `422 idempotency_key_reused`. Si la primera aún se procesa: `409 in_progress`.
- Un error 5xx no se memoriza: queda en el registro y la clave se puede reintentar.
- Las operaciones de mesa además usan la idempotencia propia del RPC (`pos_agent_operations`).

## Lecturas (GET)

Período: `?period=today|yesterday|week|month` o `?from=YYYY-MM-DD&to=YYYY-MM-DD` (máx. 366 días). Por defecto hoy.

| Ruta | Devuelve |
|---|---|
| `GET /tables[?status=FREE\|OCCUPIED]` | Mesas: `id, estado, tipo, personas, total, cliente, cantidad_items`. |
| `GET /tables/:id` | Detalle con `items` y `comandas_abiertas`. |
| `GET /orders/active[?limit]` | Pedidos no terminados (pendientes, en curso). |
| `GET /kitchen/tickets[?status=PENDING\|PREPARING\|READY]` | Comandas abiertas (por defecto todas las no entregadas/canceladas). |
| `GET /sales/summary` | `ventas_total, pedidos, ticket_promedio, por_medio_de_pago, pendientes_de_cobro`. |
| `GET /sales/by-day` | Lo mismo por día. |
| `GET /sales/top-products[&limit=10]` | Productos más vendidos (unidades e importe). |
| `GET /customers[?q=nombre-o-teléfono&with_debt=1&limit]` | Clientes: nombre, teléfono, saldo (deuda), sellos. |
| `GET /customers/:id` | Deuda efectiva, pedidos de cuenta corriente abiertos, últimos pagos y pedidos. |
| `GET /suppliers` | Proveedores con `comprado, pagado, saldo_a_pagar` (los saldos requieren la migración). |
| `GET /suppliers/:id` | Proveedor con compras y pagos. |
| `GET /expenses[?period=month]` | Gastos del período, total y por categoría (por defecto el mes en curso). |
| `GET /cash` | Caja: ingresos por medio de pago, egresos (gastos + pagos a proveedores), saldo y saldo en efectivo. |

Definiciones:
- **Venta** = pedido no cancelado y (cobrado o cargado a cuenta corriente). No cuenta los asientos "Pago Cuenta Corriente" (son cobranza, no venta). Los pedidos no cobrados ni a cuenta corriente se informan aparte en `pendientes_de_cobro`.
- Medios normalizados: `EFECTIVO, TRANSFERENCIA (incluye Santander Río), MERCADO_PAGO, TARJETA, CUENTA_CORRIENTE`.
- La **caja** se calcula con movimientos. La apertura y la rendición de caja del POS viven en el navegador y la API no las ve.
- Hay pedidos de prueba en la base (nombres como "Prueba"): la API no los filtra.

## Operaciones (POST, con `Idempotency-Key`)

| Ruta | Cuerpo | Qué hace |
|---|---|---|
| `POST /tables/:id/open` | `{ guests?, items?: [{product_id, quantity, notes?}] }` | Abre una mesa libre. Con `items`, descuenta stock y crea la comanda. |
| `POST /tables/:id/items` | `{ items: [...] }` | Agrega productos a una mesa ocupada: descuenta stock, actualiza el total y **crea la comanda** de cocina. |
| `POST /tables/:id/items/remove` | `{ product_id, quantity?: n \| "all" }` | Quita unidades, recalcula el total y devuelve el stock. No cancela comandas ya enviadas. |
| `POST /tables/:id/kitchen` | `{ items?, note? }` | Manda a cocina una comanda con lo que hay en la mesa (o con `items`). |
| `POST /tables/:id/close` | `{ payment_method: CASH\|CARD\|BANK_TRANSFER\|MERCADO_PAGO }` | Cobra y cierra: crea el pedido pagado, libera la mesa y marca las comandas como entregadas. No emite factura ni aplica descuentos. |
| `POST /customers/:id/payments` | `{ amount, method }` | Registra un pago de cuenta corriente (baja el saldo, salda pedidos y asienta en caja). Si `amount` supera la deuda, aplica la deuda y devuelve `excedente`. |
| `POST /suppliers` | `{ name, phone?, email?, cuit?, address?, contact_name?, category?, notes? }` | Carga un proveedor (nombre único). |
| `POST /purchases` | `{ supplier_id, total, date?, items?: [{description, quantity, unit_price}], invoice_ref?, note?, paid_amount?, method? }` | Registra una compra. Con `paid_amount` registra también el pago. |
| `POST /suppliers/:id/payments` | `{ amount, method?, purchase_id?, date?, note? }` | Registra un pago a proveedor. |
| `POST /expenses` | `{ description, category, amount, date?, payment_method?, note?, supplier_id? }` | Registra un gasto (ej. category: `Luz`, `Gas`, `Alquiler`). |

Los precios y nombres de productos se toman **siempre de la base**; la API ignora cualquier precio enviado.
Cantidad por línea: entero de 1 a 20.

### Lógica compartida con el POS (sin duplicar)
- Abrir / agregar / cerrar mesa: función SQL `execute_pos_agent_operation` (stock, comanda, pedido y mesa en una sola transacción, con bloqueo de la mesa y control de cambios concurrentes). La usa también el asistente interno del POS.
- Pago de cliente: `applyDebtPayment` (`lib/cuenta-corriente.ts`), el mismo que usa `/api/clientes/pay`.
- Aclaración honesta: el POS de pantalla (`OrderSheet`) hace su cierre desde el navegador; no existe una versión de servidor de esa lógica. Esta API usa la versión de servidor que ya existía (la del asistente). El cierre por API no incluye descuento ni Factura C, ni cuenta corriente como medio de cierre.

## Errores frecuentes

| HTTP | `code` | Significado |
|---|---|---|
| 400 | `idempotency_key_required`, `bad_items`, `bad_amount`, `bad_period`, ... | Petición inválida. |
| 401 / 429 | `unauthorized` / `rate_limited` | Token. |
| 404 | `not_found` | Mesa, cliente o proveedor inexistente. |
| 409 | `table_conflict`, `empty_table`, `no_debt`, `in_progress` | Estado incompatible (mesa libre/ocupada, cambió mientras se operaba, stock insuficiente). |
| 422 | `product_unavailable`, `idempotency_key_reused` | |
| 503 | `migration_pending`, `not_configured` | Falta la migración o la configuración. |

## Ejemplos

```bash
# Lectura
curl -H "Authorization: Bearer $BLOOM_OS_API_TOKEN" \
  "https://bloom-2-drab.vercel.app/api/os/sales/summary?period=today"

# Operación
curl -X POST -H "Authorization: Bearer $BLOOM_OS_API_TOKEN" \
  -H "X-Bloom-OS-Actor: bloom-os:german" -H "Idempotency-Key: $(uuidgen)" \
  -H "content-type: application/json" \
  -d '{"payment_method":"CASH"}' \
  https://bloom-2-drab.vercel.app/api/os/tables/5/close
```

## Pautas para el agente de Bloom OS
- Para preguntas ("¿cómo viene el día?"): usar solo GET (`/sales/summary`, `/tables`, `/orders/active`, `/kitchen/tickets`).
- Para operaciones: pedir confirmación explícita al usuario antes de cada POST, y generar una `Idempotency-Key` nueva por intención (reutilizarla solo para reintentar la misma operación).
- Nunca inventar cifras si una lectura devuelve `503 migration_pending` o vacío: decirlo.
