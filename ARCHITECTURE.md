# ARCHITECTURE — Estructura y Flujos del Sistema

Aplicación Next.js App Router con PostgreSQL/Drizzle, Auth.js v5 y despliegue configurado para Netlify.

### 1. Estructura
```text
kiway_inventory/
├── app/
│   ├── api/                 # Route Handlers: auth, pedidos, productos, empresas, usuarios
│   ├── dashboard/           # Vistas protegidas de pedidos, catálogo, remitos y ajustes
│   ├── login/               # Inicio de sesión
│   └── setup/               # Configuración inicial
├── components/              # Componentes de interfaz, incluidos componentes del dashboard
├── hooks/                   # Hooks de cliente
├── lib/
│   ├── db/                  # Conexión y esquema Drizzle
│   └── pdf/                 # Generación de remitos PDF
├── services/                # Reglas de negocio y acceso funcional a datos
├── scripts/                 # Scripts de mantenimiento/migración
├── proxy.ts                 # Protección de rutas y headers de caché
└── netlify.toml             # Build, publicación y headers de despliegue
```

### 2. Autenticación y protección
* `lib/auth.ts` configura Auth.js con proveedor Credentials, comparación de contraseñas bcrypt y estrategia de sesión JWT.
* El callback JWT vuelve a consultar el usuario: actualiza el rol de la sesión y la invalida si la cuenta está inactiva.
* `proxy.ts` protege las rutas no públicas y redirige usuarios no autenticados a `/login`; `lib/auth-helpers.ts` aplica guardas de sesión y rol en el servidor.
* `/api/auth/*` está excluido del matcher del proxy para que Auth.js administre callback y cierre de sesión. `netlify.toml` define sus headers de no-cache por separado.
* Las respuestas autenticadas y las rutas críticas tienen headers `no-store`; conservarlos para evitar servir datos de sesión desde caché.

### 3. Módulos de aplicación
* **Pedidos:** listado, creación y edición de borradores, envío, aprobación, rechazo y cancelación, según los permisos.
* **Empresas y presupuesto:** administración de empresas y evaluación del consumo mensual.
* **Productos y stock:** catálogo, ajustes individuales, actualización masiva por CSV (SKU, precio y/o stock) y exportación CSV de productos activos.
* **Usuarios:** administración desde el dashboard y API, con roles y desactivación/reactivación.
* **Autorizaciones extra:** solicitudes de supervisores y aprobación/rechazo por administradores.
* **Remitos:** listado en el dashboard y generación de PDF para pedidos aprobados; el PDF admite incluir o excluir valores.

### 4. Límites de negocio y persistencia
La UI consume Route Handlers en `app/api/`, mientras `services/` concentra las reglas reutilizadas por las rutas. El límite mensual y las autorizaciones se comprueban en el servicio de pedidos, no mediante una restricción única de PostgreSQL. Los snapshots en `order_items` protegen el historial frente a cambios posteriores del catálogo; el registro `remitos` entrega numeración interna al aprobar.

### 5. Despliegue
`netlify.toml` ejecuta `npm run build`, publica `.next` y define headers para auth, login, dashboard y página inicial. Mantener el comportamiento de cacheado y las rutas configuradas al cambiar middleware o despliegue.
