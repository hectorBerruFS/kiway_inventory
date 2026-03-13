# DATABASE_RULES — Esquema de Datos e Integridad

Este documento detalla la estructura completa de la base de datos (PostgreSQL + Drizzle) y las reglas de integridad que rigen el sistema.

### 1. Entidades del Sistema

#### `users` (Usuarios)
*   **id:** uuid (PK, defaultRandom)
*   **name:** varchar(255)
*   **email:** varchar(255) (Unique)
*   **password:** varchar(255) (Bcrypt hash)
*   **role:** integer (0: Staff, 1: Supervisor, 2: Admin, 3: Superadmin)
*   **createdAt:** timestamp

#### `products` (Catálogo)
*   **id:** uuid (PK)
*   **name:** varchar(255)
*   **brand:** varchar(255)
*   **category:** varchar(255)
*   **price:** numeric(10, 2)
*   **isActive:** boolean (Soft delete)
*   **imageUrl:** varchar(500)

#### `companies` (Empresas/Centros)
*   **id:** uuid (PK)
*   **name:** varchar(255)
*   **monthlyBudget:** numeric(10, 2)
*   **supervisorId:** uuid (FK -> users.id)

#### `orders` (Pedidos) — **[DESTACADO: NUEVOS CAMPOS]**
*   **id:** uuid (PK)
*   **companyId:** uuid (FK)
*   **supervisorId:** uuid (FK)
*   **status:** enum ('draft', 'sent', 'approved', 'rejected', 'cancelled')
*   **total:** numeric(10, 2)
*   **intendedMonth:** varchar(7) — **[NUEVO]** Formato `YYYY-MM`. Determina el mes al que aplica el presupuesto.
*   **createdAt:** timestamp

#### `order_items` (Items de Pedido) — **[DESTACADO: SNAPSHOTS]**
*   **id:** uuid (PK)
*   **orderId:** uuid (FK)
*   **productId:** uuid (FK)
*   **quantity:** integer
*   **nameSnapshot:** varchar(255) — **[COMPLETADO]** Nombre al momento de la orden.
*   **brandSnapshot:** varchar(255) — **[COMPLETADO]** Marca al momento de la orden.
*   **priceSnapshot:** numeric(10, 2) — **[COMPLETADO]** Precio al momento de la orden.

#### `extra_order_authorizations` — **[NUEVA ENTIDAD]**
*   **id:** uuid (PK)
*   **companyId:** uuid (FK)
*   **supervisorId:** uuid (FK) (Solicitante)
*   **adminId:** uuid (FK) (Autorizador)
*   **month:** varchar(7) (Mes de la excepción)
*   **reason:** varchar(500) (Justificación)
*   **status:** enum ('pending', 'authorized', 'used', 'rejected')
*   **createdAt:** timestamp

### 2. Reglas de Integridad Críticas
1.  **Snapshots:** Es OBLIGATORIO guardar el estado del producto (`name`, `brand`, `price`) en los campos `Snapshot` al momento de aprobar o enviar un pedido. No se debe depender de la tabla `products` para facturación o remitos históricos.
2.  **Unicidad de Pedido Mensual:** El sistema valida que no exista más de un pedido con estado `sent` o `approved` para la misma `companyId` y el mismo `intendedMonth` sin una autorización extra 'authorized'.
3.  **Soft Delete:** Los productos nunca se eliminan físicamente; se usa `isActive: false` para evitar romper la integridad referencial de pedidos antiguos.
4.  **Consumo de Autorización:** Cuando se envía un pedido usando una autorización extra, su estado debe cambiar a `used`.