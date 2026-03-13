# AGENTS — AI Governance & Project Rules

Este documento define las reglas obligatorias para la generación de código. El objetivo es mantener el control administrativo estricto solicitado por el cliente y garantizar la estabilidad del entorno.

### 1. Stack Tecnológico & Estabilidad
*   **Framework:** Next.js (App Router) Latest.
*   **Autenticación:** **Auth.js v5 (Beta)**.
*   **Base de Datos:** PostgreSQL con **Drizzle ORM** (Prohibido Prisma).
*   **Deploy:** Optimizado para **Netlify Plan Free**.
*   **CRÍTICO (Estabilidad):** Para evitar problemas de persistencia de sesión en Netlify, todo el contenido autenticado DEBE usar headers de caché agresivos:
    *   `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`
    *   `Pragma: no-cache`
    *   `Expires: 0`
    *   Esta configuración debe estar tanto en el middleware (`proxy.ts`) como en `netlify.toml`.
*   **IMPORTANTE (Excepción de Middleware):** Las rutas `/api/auth/*` (especialmente `signout` y `callback`) deben estar **excluidas** del procesamiento del middleware envuelto en `auth()` para permitir que Auth.js gestione sus propios flujos sin interferencias ni bucles de redirección.

### 2. Reglas Críticas de Negocio (Control de Pedidos)
#### 2.1 Restricción de Pedidos Múltiples
*   **Regla:** Solo se permite **un pedido** (en estado 'sent' o 'approved') por empresa y por mes (`intendedMonth`).
*   **Bloqueo Preventivo:** Si ya existe un pedido en curso o aprobado, el sistema **deshabilita** el botón de "Nuevo Pedido" para el Supervisor.
*   **Flujo de Excepción:** El Supervisor debe "Solicitar Autorización de Pedido Extra". Solo tras la aprobación del Administrador se habilita la creación del nuevo borrador.

#### 2.2 Presupuesto y Validación
*   **Cálculo:** `monthlyBudget − SUM(approved + sent orders)`.
*   **Advertencia:** No bloquea el envío si se excede el presupuesto (es informativo), pero se bloquea estrictamente la cantidad de pedidos por mes sin autorización extra.

### 3. Roles y Autorización (Niveles)
*   **STAFF (0):** Visualización básica.
*   **SUPERVISOR (1):** Crea borradores, envía pedidos y solicita autorizaciones extra.
*   **ADMIN (2):** Gestiona productos, presupuestos y **autoriza pedidos extra**.
*   **SUPERADMIN (3):** Control total del sistema y gestión de usuarios.

### 4. Snapshots Obligatorios
*   Al aprobar un pedido, se **congelan** los datos en `order_items`: `nameSnapshot`, `brandSnapshot`, `priceSnapshot`. El remito y reportes históricos deben usar estos snapshots, no los datos actuales de la tabla `products`.

### 5. Mobile-First
*   Diseño 100% responsive. Botones táctiles de al menos 40px de altura. Flujos optimizados para ejecución desde celular.
