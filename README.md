# 🌸 Bloom OS v2.0 Premium
### Sistema de Gestión Integral para Gastronomía y Retail

Bloom OS es una solución de Punto de Venta (POS) moderna, rápida y visualmente impactante, diseñada para optimizar la operación de restaurantes, cafeterías y bares.

---

## 🚀 Características Principales

### 🖥️ Terminal POS de Alta Velocidad
- **Atajos de Teclado Full (F1-F12)**: Operación 100% optimizada para teclado, minimizando el uso del mouse.
- **Grilla de Productos Inteligente**: Organización en 5 categorías lógicas con nombres cortos para una selección ultra veloz.
- **Gestión de Mesas**: Control visual del estado de las mesas (Libre/Ocupada).

### 👨‍🍳 Panel de Cocina (Comandas) en Tiempo Real
- **Sincronización Instantánea**: Las comandas enviadas desde el POS aparecen al instante en cocina.
- **Flujo de Trabajo**: Estados dinámicos (Pendiente -> Preparando -> ¡Listo! -> Entregado).
- **Notas de Pedido**: Comunicación directa mozo-cocinero.

### 💳 Integración con Mercado Pago
- **Generación Dinámica de QR**: Cobros instantáneos generando un código QR real que el cliente puede escanear desde su celular.
- **Múltiples Métodos de Pago**: Soporte para Efectivo, Tarjeta y MP.

### 📊 Gestión Avanzada
- **Historial de Ventas**: Registro detallado de cada orden procesada.
- **Facturación Flexible**: Soporte para Factura A, B, C y Tickets.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15+ (App Router), React 19, Tailwind CSS.
- **Backend/Base de Datos**: Supabase (PostgreSQL) con Realtime enabled.
- **Animaciones**: Framer Motion.
- **Pagos**: Mercado Pago SDK.
- **Iconografía**: Lucide React.

---

## ⚙️ Configuración del Entorno

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Germanmdq/bloom.git
   cd bloom
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Variables de Entorno**:
   Crear un archivo `.env.local` con las siguientes claves:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
   MERCADO_PAGO_ACCESS_TOKEN=tu_token
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

4. **Base de Datos**:
   Ejecutar los scripts ubicados en `/supabase`:
   - `complete_setup.sql`: Estructura base y menú.
   - `kitchen_setup.sql`: Sistema de comandas.

5. **Iniciar Desarrollo**:
   ```bash
   npm run dev
   ```

---

## 🎨 Diseño & UX
El sistema sigue una estética **Premium Dark/Yellow**, inspirada en los sistemas POS industriales más avanzados, pero con la fluidez de una aplicación web moderna.

---

Desarrollado con ❤️ para **Bloom**.
