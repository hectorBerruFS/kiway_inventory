# REFACTOR_SERVICES — Servicios de Negocio e Integraciones

Los servicios bajo `services/` centralizan operaciones de pedidos, presupuesto, autorizaciones, empresas y productos. Los Route Handlers de `app/api/` exponen estas operaciones y la interfaz del dashboard los consume.

### 1. Pedidos — `order.service.ts`
* `createOrder(userId, userRole, input)`: valida datos, permisos y acceso de supervisores a su empresa; verifica el límite mensual y autorización extra para el flujo de supervisor; calcula el total y crea un borrador con snapshots iniciales.
* `sendOrder(orderId, userId, userRole, intendedMonth?)`: valida estado, creador e ítems; calcula la evaluación de presupuesto, cambia el estado a `sent` y puede devolver una advertencia de exceso sin bloquear el envío.
* `approveOrder(orderId, userId, userRole)`: requiere rol administrador y estado `sent`; actualiza los snapshots desde los productos actuales, aprueba el pedido y crea el registro de remito de forma transaccional.
* `getOrderWithItems(...)` y `listOrders(...)`: aplican visibilidad según rol e incluyen el número de remito y la evaluación presupuestaria.
* Las líneas históricas y los PDFs usan `nameSnapshot`, `brandSnapshot` y `priceSnapshot`.

### 2. Presupuesto — `budget.service.ts`
* `getMonthlyConsumedBudget(companyId, yearMonth?)`: suma pedidos `approved`.
* `getMonthlyCommittedBudget(companyId, yearMonth?)`: suma pedidos `approved` y `sent`.
* `getAvailableBudget(...)` y `validateBudgetForOrder(...)`: calculan saldo y validan el pedido; el resultado de exceso es advertencia, no bloqueo de envío.
* `checkMonthlyOrderLimit(companyId, month)`: informa si ya existe un pedido `sent` o `approved` para esa empresa y mes.
* Los registros sin `intendedMonth` se asignan al mes de `createdAt` en los cálculos presupuestarios que contemplan datos anteriores.

### 3. Autorizaciones — `authorization.service.ts`
* `requestExtraOrder(companyId, supervisorId, month, reason)`: solicita autorización y exige una justificación de al menos 10 caracteres; evita crear otra solicitud pendiente para la empresa y el mes.
* `authorizeExtraOrder(authId, adminId, approve?)`: registra la decisión y al administrador que la toma.
* `validateAuthorization(companyId, month)`: busca una autorización en estado `authorized`.
* `consumeAuthorization(authId)`: pasa la autorización a `used` al enviar un pedido que la utiliza.

### 4. Productos y administración
* `product.service.ts` crea, actualiza, lista y desactiva productos; no realiza borrado físico.
* La administración de stock y cambios masivos se expone desde `/dashboard/settings/stock` y `/api/products/bulk-update`. El CSV de importación admite encabezados `sku` y `price` y/o `stock`; el servidor valida roles, valores, productos activos y duplicados, y aplica los cambios en una transacción.
* La exportación del catálogo desde `/dashboard/products` descarga un CSV de productos activos con SKU, nombre, marca y precio.
* La administración de usuarios se realiza mediante `/api/users` y `/api/users/[id]`; las rutas restringen estas operaciones a ADMIN o SUPERADMIN.

### 5. Remitos PDF
`/api/orders/[id]/receipt-pdf` requiere sesión y autorización para consultar el pedido, permite generar PDF solo cuando está `approved` y acepta `includePrices=false` para omitir valores. El documento se basa en los snapshots y envía headers para evitar caché.
