# ARCHITECTURE — Estructura & Estabilidad

Este documento describe la arquitectura técnica del proyecto, centrada en Next.js App Router y la estabilidad de sesiones en Netlify.

### 1. Estructura de Carpetas
```text
kiway_inventory/
├── app/                  # Rutas (Route Groups) y API Routes
│   ├── (auth)/           # Rutas públicas de autenticación (login)
│   ├── (app)/            # Rutas protegidas de la aplicación
│   └── api/              # Endpoints de API y Auth.js handlers
├── components/           # UI Components (Mobile-First)
├── lib/                  # Librerías y configuraciones core
│   ├── auth.ts           # Configuración de Auth.js v5
│   ├── db/               # Esquema e índice de Drizzle
│   └── auth-helpers.ts   # Helpers de protección (requireAuth, requireAdmin)
├── services/             # Lógica de negocio (Server-Side)
│   ├── order.service.ts  # Gestión de pedidos y snapshots
│   └── ...               # Otros servicios (budget, company, etc.)
├── proxy.ts              # Middleware oficial (Protección y Cache-Control)
└── netlify.toml          # Configuración de deploy y headers globales
```

### 2. Capa de Estabilidad (Netlify)
Para garantizar que las sesiones no se queden "pegadas" o sean cacheadas incorrectamente por el CDN de Netlify:
1.  **Middleware (`proxy.ts`):** Inyecta headers `no-store` en todas las rutas protegidas. Además, **excluye explícitamente `/api/auth`** del `matcher` y de la protección obligatoria para permitir que el logout y los callbacks de Auth.js funcionen correctamente.
2.  **Global Headers:** El archivo `netlify.toml` refuerza estas reglas para rutas críticas (`/api/auth/*`, `/login`, `/dashboard`).
3.  **Server Components:** Se utilizan `requireAuth()` y `requireAdmin()` en el lado del servidor para validaciones robustas.

### 3. Flujo de Protección de Rutas
*   **Públicas:** `/login` (redirecciona a dashboard si ya hay sesión).
*   **Protegidas:** Todo bajo `/dashboard` o dentro del grupo `(app)`.
*   **Validación:** El middleware en `proxy.ts` detecta el token de `authjs` y redirige al login si no existe, previniendo visualizaciones de datos cacheados.

### 4. Lógica de Negocio Centralizada
Toda la validación compleja (como el límite de un pedido por mes) reside en la carpeta `services/`. Los componentes de la UI y los API Routes consumen estos servicios para mantener la consistencia.