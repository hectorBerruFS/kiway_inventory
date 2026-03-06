# ARCHITECTURE — Estructura Oficial de 

### 1. Estructura de Carpetas Refinada
ki_inventory/
├── app/ (Rutas y Server Actions)
├── components/ (UI Mobile-First)
├── lib/db/ (Drizzle Schema e Index)
└── services/ (Lógica de negocio centralizada)
    ├── order.service.ts
    ├── budget.service.ts
    ├── company.service.ts
    ├── product.service.ts
    └── authorization.service.ts (NUEVO: Gestiona pedidos extra)

### 2. Capa de Servicios
Toda la lógica de validación de "Un pedido por mes" vive en los servicios, no en la UI.

### 3. Flujo de Pedido Extra
1. **Detección:** `budget.service` detecta pedido previo en el mes.
2. **Solicitud:** `authorization.service` crea un registro 'pending'.
3. **Aprobación:** Admin cambia estado a 'authorized'.
4. **Consumo:** `order.service` permite `createOrder` solo si hay autorización activa para ese periodo.
5. **Visibilidad:** El endpoint `/api/companies/[id]/budget` sincroniza el estado de la autorización para desbloquear la UI del Supervisor.