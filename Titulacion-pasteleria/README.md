# Dulce Panel — Dashboard para pastelería

Aplicación full stack para administrar una pastelería con:

- React + Vite
- Tailwind CSS
- Node.js + Express
- MySQL

## Funciones

- Dashboard con ventas, pedidos, clientes e inventario.
- Gráfica de ventas de los últimos 7 días.
- CRUD de productos.
- Registro de clientes.
- Creación de pedidos con varios productos.
- Descuento automático de existencias.
- Cambio de estado de pedidos.
- Restauración de inventario al cancelar un pedido.
- Alertas de productos con pocas existencias.
- Diseño responsive para computadora, tablet y celular.

## Requisitos

- Node.js 20.19 o superior.
- MySQL 8 o superior.
- npm.

## 1. Crear la base de datos

Desde MySQL Workbench, phpMyAdmin o la terminal de MySQL, ejecuta:

```sql
SOURCE database/schema.sql;
```

También puedes abrir `database/schema.sql`, copiar todo y ejecutarlo.

## 2. Configurar el backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

En Windows PowerShell puedes usar:

```powershell
Copy-Item .env.example .env
```

Edita `.env` con tu usuario y contraseña de MySQL.

El servidor se inicia en `http://localhost:4000`.

## 3. Iniciar el frontend

En otra terminal:

```bash
cd client
npm install
npm run dev
```

Abre la dirección que muestre Vite, normalmente `http://localhost:5173`.

## Estructura

```text
pasteleria-dashboard/
├── client/       Frontend React + Tailwind
├── server/       API Node.js + Express
├── database/     Script SQL y datos de ejemplo
└── README.md
```

## API principal

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`

## Nota

El proyecto incluye datos de ejemplo. Puedes eliminarlos o modificarlos desde MySQL después de importar el archivo SQL.
