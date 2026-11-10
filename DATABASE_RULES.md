# DATABASE_RULES — Esquema de Datos e Integridad

Este documento detalla la estructura completa de la base de datos (PostgreSQL + Drizzle) y las reglas de integridad que rigen el sistema.

### 1. Entidades

#### `users`
* `id`: UUID, clave primaria.
* `name`, `email`, `password`: datos requeridos; el email es único y la contraseña se almacena como hash.
* `role`: entero con valores de rol 0–3; predeterminado 0.
* `isActive`: booleano, predeterminado `true`; permite desactivar usuarios.
* `createdAt`: timestamp.

#### `products`
* `id`: UUID, clave primaria.
* `name`, `brand`, `category`: texto requerido.
* `sku`: texto opcional, usado para identificar productos en cargas CSV.
* `price`: `numeric(10,2)`; `stock`: entero con valor predeterminado 0.
* `imageUrl`: texto opcional; `isActive`: booleano, predeterminado `true`.
* `createdAt`: timestamp.

#### `companies`
* `id`: UUID, clave primaria; `name`: texto requerido.
* `monthlyBudget`: `numeric(10,2)`.
* `supervisorId`: clave foránea requerida a `users.id`.
* `createdAt`: timestamp.

#### `orders`
* `id`: UUID, clave primaria.
* `companyId` y `supervisorId`: claves foráneas requeridas.
* `status`: enum `draft`, `sent`, `approved`, `rejected` o `cancelled`; predeterminado `draft`.
* `total`: `numeric(10,2)`, predeterminado 0.
* `intendedMonth`: texto de hasta 7 caracteres, normalmente `YYYY-MM`; admite `NULL` para registros anteriores o sin mes explícito.
* `createdAt`: timestamp.

#### `order_items`
* `id`: UUID, clave primaria; `orderId`: clave foránea con borrado en cascada.
* `productId`: clave foránea a `products.id`.
* `quantity`: entero, predeterminado 1.
* `nameSnapshot`, `brandSnapshot`: texto requerido; `priceSnapshot`: `numeric(10,2)` requerido.

#### `remitos`
* `id`: UUID, clave primaria.
* `orderId`: clave foránea única a `orders.id`, con borrado restringido.
* `internalNumber`: entero generado por identidad; `createdAt`: timestamp.
* Se crea el registro al aprobar el pedido y provee el número interno del remito.

#### `extra_order_authorizations`
* `id`: UUID, clave primaria; `companyId` y `supervisorId`: claves foráneas requeridas.
* `adminId`: clave foránea nullable a `users.id`.
* `month`: texto requerido de formato `YYYY-MM`; `reason`: texto requerido de hasta 500 caracteres.
* `status`: enum `pending`, `authorized`, `used` o `rejected`; predeterminado `pending`.
* `createdAt`: timestamp.

### 2. Integridad y reglas de negocio
1. Los snapshots del pedido se guardan al crear o editar sus ítems y se refrescan al aprobar. Remitos y vistas históricas deben usar esos campos.
2. El límite mensual de pedidos `sent`/`approved` se comprueba desde el servicio de pedidos para el flujo de supervisores; no hay una restricción única equivalente declarada en el esquema.
3. Las autorizaciones extra relacionan empresa, supervisor y mes. El flujo previsto es `pending` → `authorized` o `rejected`; al usarla para un pedido, pasa a `used`.
4. Los productos y usuarios se desactivan en vez de eliminarse físicamente, para preservar referencias e historial.
5. El remito está asociado a un único pedido. Su clave foránea usa `ON DELETE RESTRICT` para proteger el documento histórico.
