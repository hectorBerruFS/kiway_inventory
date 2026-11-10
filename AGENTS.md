# AGENTS — Gobierno del Proyecto y Reglas de Negocio

Este documento reúne las reglas funcionales y técnicas que deben conservarse al modificar el sistema.

### 1. Stack y estabilidad
* **Framework:** Next.js App Router.
* **Autenticación:** Auth.js v5 (Credentials, sesión JWT).
* **Base de datos:** PostgreSQL con Drizzle ORM. No incorporar Prisma.
* **Deploy:** Netlify; mantener la configuración compatible con el plan Free.
* Las respuestas de rutas autenticadas deben evitar caché con:
  * `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`
  * `Pragma: no-cache`
  * `Expires: 0`
* Los flujos `/api/auth/*` no deben pasar por la protección envuelta en `auth()` de `proxy.ts`; los headers de caché se configuran aparte en `netlify.toml`.

### 2. Pedidos, límites y presupuesto
* Los pedidos registran el mes presupuestario en `intendedMonth` (`YYYY-MM`).
* Para supervisores, se limita la creación de pedidos por empresa y mes cuando ya existe uno `sent` o `approved`; la excepción requiere una autorización extra aprobada por un administrador.
* El límite se valida en los servicios de pedidos; no es una restricción única de la base de datos. No duplicar esta lógica únicamente en la UI.
* El exceso de presupuesto se presenta como advertencia y no debe impedir el envío.
* Diferenciar presupuesto aprobado/consumido del comprometido: el servicio ofrece cálculos que consideran solo pedidos `approved` y otros que consideran `approved` + `sent`.

### 3. Roles y administración
* **STAFF (0):** acceso de lectura según las rutas habilitadas.
* **SUPERVISOR (1):** crea y envía pedidos, solicita autorizaciones extra y consulta sus pedidos.
* **ADMIN (2):** administra catálogo, precios, stock, empresas y usuarios; gestiona pedidos y autoriza pedidos extra.
* **SUPERADMIN (3):** puede gestionar el rol Superadmin, además de las capacidades de administrador.
* Los usuarios pueden desactivarse; no se deben borrar físicamente para conservar referencias e historial. Un usuario inactivo no puede iniciar sesión.
* Mantener las comprobaciones de rol tanto en el servidor como en las API, no solo en los controles de interfaz.

### 4. Catálogo, stock e importación
* Los productos incluyen SKU opcional, precio, stock e indicador `isActive`.
* La baja de productos es lógica (`isActive: false`), no física.
* La exportación CSV del catálogo contiene los productos activos. La carga masiva de precios/stock identifica productos por SKU, valida los datos y solo modifica productos activos.

### 5. Historial y remitos
* `order_items` conserva snapshots obligatorios de nombre, marca y precio. Se inicializan al crear/editar el pedido y se actualizan al aprobarlo.
* Los remitos y los reportes históricos deben presentar los snapshots, no los datos actuales del catálogo.
* La aprobación genera el registro numerado del remito. El PDF puede generarse con valores o sin valores.

### 6. Interfaz
* Mantener la interfaz responsive y mobile-first. Los controles interactivos deben ser cómodos para uso táctil y los flujos principales deben funcionar en móvil y escritorio.
