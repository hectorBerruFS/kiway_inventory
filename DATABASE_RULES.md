# DATABASE_RULES — Integridad y Nuevas Entidades

### 1. Nuevas Tablas
#### extra_order_authorizations
* **id:** uuid primary key.
* **companyId:** uuid references companies.id.
* **month:** varchar(7) (Formato YYYY-MM).
* **status:** enum ('pending', 'authorized', 'used', 'rejected').
* **supervisorId:** uuid references users.id.
* **adminId:** uuid references users.id (quien autoriza).
* **reason:** text (justificación del supervisor).

### 2. Integridad de Pedidos
* **intended_month:** varchar(7) obligatorio para determinar a qué periodo pertenece el pedido.
* **Snapshots:** Inmutabilidad total en `order_items` tras la aprobación.

### 3. Soft Delete
* Los productos se desactivan con `isActive = false`, nunca se borran si tienen pedidos asociados.