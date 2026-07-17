USE pasteleria_dashboard;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB;

-- Cuentas iniciales para probar el cambio de usuario.
-- Administrador: admin@dulcepanel.com / Admin123!
-- Empleado: empleado@dulcepanel.com / Empleado123!
INSERT IGNORE INTO users (name, email, password_hash, role, status) VALUES
('Administrador Principal', 'admin@dulcepanel.com', 'scrypt$86b37995e00a24f2d768d081d7bc6939$5b001acbd61aa51e92aa24a40036153795c4e2299b41f5ff29eb31ba99be1a1ad4732cd3a06944b494d2ce0be8d6fef705653bf728ce6d5290229aacd97bb9a0', 'admin', 'active'),
('Empleado de Mostrador', 'empleado@dulcepanel.com', 'scrypt$0ddbb64443955a479e865d0126d50300$c1c8cc9ec38ee818d58b184d79728bd7dfecfdc8cc1f36ac370a1e34e91b9b37cce3b53bf301885a25b925068f1d88072b04241f7c2ed806f1f46bec82be4c53', 'employee', 'active');
