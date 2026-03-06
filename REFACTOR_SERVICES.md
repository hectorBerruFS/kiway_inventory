# REFACTOR_SERVICES — Lógica de Autorizaciones y Pedidos (COMPLETADO)

### budget.service.ts 
* `checkMonthlyOrderLimit(companyId, month)`: [DONE] Retorna true si ya existe un pedido `sent` o `approved` en ese mes.

### authorization.service.ts 
* `requestExtraOrder(companyId, month, supervisorId, reason)`: [DONE] Crea solicitud pendiente.
* `authorizeExtraOrder(authId, adminId)`: [DONE] Cambia estado a 'authorized' o 'rejected' y registra el `adminId`.
* `getPendingAuthorizations()`: [DONE] Lista solicitudes para el dashboard Admin.
* `validateAuthorization(companyId, month)`: [DONE] Verifica si existe un permiso 'authorized' disponible para usar.

### order.service.ts 
* `createOrder()`: [DONE] Incluye check previo: si ya hay pedidos en el mes, exige que `validateAuthorization` sea exitoso.
* `sendOrder()`: [DONE] Al enviarse un pedido extra, marca la autorización como 'used' para que no se pueda reutilizar.

### Integración API/UI
* **Endpoint Presupuesto**: [DONE] Informa `hasExtraAuthorization` para desbloquear preventivamente la carga del pedido.
* **Admin Dashboard**: [DONE] Implementación Mobile-First con botones táctiles grandes para aprobar/rechazar solicitudes.
