# AGENTS — AI Governance & Project Rules

Este documento define las reglas obligatorias para la generación de código. El objetivo es mantener el control administrativo estricto solicitado por el cliente.

### 1. Stack Tecnológico
* **Framework:** Next.js (App Router) Latest.
* **Base de Datos:** PostgreSQL con **Drizzle ORM** (Prohibido Prisma).
* **Deploy:** Optimizado para **Netlify Plan Free** (evitar librerías pesadas).

### 2. Reglas Críticas de Negocio (Control de Pedidos)
#### 2.1 Restricción de Pedidos Múltiples (NUEVO)
* **Regla:** Solo se permite **un pedido** (en estado 'sent' o 'approved') por empresa y por mes (`intendedMonth`).
* **Bloqueo Preventivo:** Si ya existe un pedido en curso o aprobado, el sistema **deshabilita** el botón de "Nuevo Pedido" para el Supervisor.
* **Flujo de Excepción:** El Supervisor debe presionar "Solicitar Autorización de Pedido Extra". El Administrador es el único que puede otorgar este permiso. Solo tras la autorización se habilita la creación del nuevo borrador.

#### 2.2 Presupuesto y Validación
* **Cálculo:** `monthlyBudget − SUM(approved + sent orders)`.
* **Advertencia:** No bloquea el envío si se excede el presupuesto, pero sí bloquea si no hay autorización para un segundo pedido en el mismo periodo.

### 3. Roles y Autorización
* **SUPERVISOR (1):** Crea borradores y envía pedidos. Solicita autorizaciones extra.
* **ADMIN (2):** Gestiona productos, presupuestos y **autoriza pedidos extra**.

### 4. Snapshots Obligatorios
* Al aprobar un pedido, se congelan en `order_items`: `nameSnapshot`, `brandSnapshot`, `priceSnapshot` y `quantity`. El remito se genera solo con estos datos.

### 5. Mobile-First
* Priorizar cards y botones grandes. El flujo de solicitud de autorización debe ser simple, con botones táctiles de al menos 40px de altura y texto descriptivo claro, ejecutable 100% desde el celular.
