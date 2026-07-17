CREATE DATABASE IF NOT EXISTS pasteleria_dashboard
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pasteleria_dashboard;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_category (category),
  INDEX idx_products_status (status)
) ENGINE=InnoDB;

CREATE TABLE customers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(25) NULL,
  email VARCHAR(160) NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customers_name (name)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NULL,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  status ENUM('pending', 'preparing', 'ready', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  payment_method ENUM('cash', 'card', 'transfer') NOT NULL DEFAULT 'cash',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_orders_status (status),
  INDEX idx_orders_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_order_items_order (order_id),
  INDEX idx_order_items_product (product_id)
) ENGINE=InnoDB;

INSERT INTO products (name, category, description, price, stock, status) VALUES
('Pastel de chocolate', 'Pasteles', 'Chocolate oscuro con ganache y frutos rojos.', 420.00, 12, 'active'),
('Pastel tres leches', 'Pasteles', 'Bizcocho suave con mezcla de tres leches.', 390.00, 8, 'active'),
('Cheesecake de fresa', 'Pasteles', 'Cheesecake horneado con salsa de fresa.', 460.00, 5, 'active'),
('Caja de 6 cupcakes', 'Cupcakes', 'Cupcakes surtidos con betún de vainilla.', 210.00, 18, 'active'),
('Galleta decorada', 'Galletas', 'Galleta de mantequilla decorada a mano.', 45.00, 32, 'active'),
('Tarta de limón', 'Tartas', 'Base crujiente, crema de limón y merengue.', 330.00, 4, 'active'),
('Brownie premium', 'Postres', 'Brownie de chocolate con nuez.', 65.00, 25, 'active'),
('Macaron surtido', 'Postres', 'Macaron artesanal en sabores de temporada.', 38.00, 3, 'active');

INSERT INTO customers (name, phone, email) VALUES
('Mariana López', '55 1234 8899', 'mariana@example.com'),
('Luis Hernández', '55 8890 2201', 'luis@example.com'),
('Sofía Ramírez', '55 6701 4588', 'sofia@example.com'),
('Carlos Mendoza', '55 2311 9022', 'carlos.m@example.com'),
('Fernanda Ortiz', '55 9900 1134', 'fernanda@example.com');

INSERT INTO orders (customer_id, order_number, status, payment_method, total, notes, created_at) VALUES
(1, 'PED-1001', 'delivered', 'card', 420.00, 'Mensaje: Feliz cumpleaños.', NOW() - INTERVAL 6 DAY),
(2, 'PED-1002', 'delivered', 'transfer', 255.00, NULL, NOW() - INTERVAL 5 DAY),
(3, 'PED-1003', 'delivered', 'cash', 460.00, 'Entregar después de las 4 pm.', NOW() - INTERVAL 4 DAY),
(4, 'PED-1004', 'delivered', 'card', 330.00, NULL, NOW() - INTERVAL 3 DAY),
(5, 'PED-1005', 'preparing', 'transfer', 520.00, 'Sin nuez.', NOW() - INTERVAL 1 DAY),
(1, 'PED-1006', 'ready', 'cash', 286.00, NULL, NOW()),
(3, 'PED-1007', 'pending', 'card', 390.00, 'Agregar velas.', NOW());

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1, 1, 1, 420.00, 420.00),
(2, 4, 1, 210.00, 210.00),
(2, 5, 1, 45.00, 45.00),
(3, 3, 1, 460.00, 460.00),
(4, 6, 1, 330.00, 330.00),
(5, 1, 1, 420.00, 420.00),
(5, 7, 1, 65.00, 65.00),
(5, 5, 1, 35.00, 35.00),
(6, 4, 1, 210.00, 210.00),
(6, 8, 2, 38.00, 76.00),
(7, 2, 1, 390.00, 390.00);
