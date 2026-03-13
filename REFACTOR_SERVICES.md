# REFACTOR_SERVICES — Lógica de Autorizaciones y Pedidos

Este documento confirma la implementación de los servicios centrales y su integración con el sistema de autorizaciones extra.

### 1. Estado de Implementación (COMPLETADO)

#### `budget.service.ts`
*   `checkMonthlyOrderLimit(companyId, month)`: Retorna `true` si ya existe un pedido `sent` o `approved` en ese mes.
*   `getMonthlyConsumption(companyId, month)`: Calcula el total de pedidos realizados contra el presupuesto.

#### `authorization.service.ts`
*   `requestExtraOrder(companyId, month, supervisorId, reason)`: Crea solicitud pendiente (`pending`).
*   `authorizeExtraOrder(authId, adminId)`: Cambia estado a `authorized` o `rejected`.
*   `validateAuthorization(companyId, month)`: Verifica si existe un permiso válido para crear un pedido extra.

#### `order.service.ts`
*   `createOrder()`: Valida límites mensuales y autorizaciones extra activas.
*   `sendOrder(orderId)`: Finaliza el pedido, genera los **Snapshots** (importante para integridad) y marca la autorización extra como `used`.

### 2. Patrones de Integración

#### Server Actions
Se utilizan Server Actions para invocar estos servicios directamente desde el cliente, garantizando que la lógica de seguridad y db-access nunca se exponga. Todas las acciones de servidor incluyen:
*   Verificación de sesión vía `auth()`.
*   Validación de roles vía `requireRole()`.
*   Manejo consistente de errores para la UI.

#### Estabilidad de Datos
El uso de servicios centralizados asegura que no haya duplicidad de lógica de validación entre los distintos "Route Handlers" y los componentes de servidor.
