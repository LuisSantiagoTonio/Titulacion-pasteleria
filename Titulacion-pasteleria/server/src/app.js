import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, pool } from './db.js';
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from './auth.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

const allowedOrigins = String(process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  }
}));
app.use(express.json());

const allowedStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
const allowedPayments = ['cash', 'card', 'transfer'];

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}


function publicUser(user) {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at
  };
}

async function requireAuth(req, res, next) {
  try {
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return res.status(401).json({ message: 'Debes iniciar sesión.' });

    const tokenHash = hashSessionToken(token);
    const [[session]] = await pool.query(`
      SELECT s.token_hash, s.expires_at, u.id, u.name, u.email, u.role, u.status, u.created_at
      FROM user_sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.status = 'active'
      LIMIT 1
    `, [tokenHash]);

    if (!session) return res.status(401).json({ message: 'Tu sesión expiró. Inicia sesión nuevamente.' });
    req.user = publicUser(session);
    req.sessionTokenHash = tokenHash;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Solo un administrador puede realizar esta acción.' });
  }
  next();
}

function validateUserInput(body, editing = false) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = body.role === 'admin' ? 'admin' : 'employee';
  const status = body.status === 'inactive' ? 'inactive' : 'active';

  if (!name) return { error: 'El nombre es obligatorio.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Escribe un correo válido.' };
  if ((!editing || password) && password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' };

  return { value: { name, email, password, role, status } };
}

function normalizeProduct(body) {
  return {
    name: String(body.name || '').trim(),
    category: String(body.category || '').trim(),
    description: String(body.description || '').trim() || null,
    price: Number(body.price),
    stock: Number(body.stock),
    status: body.status === 'inactive' ? 'inactive' : 'active'
  };
}

function validateProduct(product) {
  if (!product.name || !product.category) return 'Nombre y categoría son obligatorios.';
  if (!Number.isFinite(product.price) || product.price < 0) return 'El precio no es válido.';
  if (!Number.isInteger(product.stock) || product.stock < 0) return 'Las existencias no son válidas.';
  return null;
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, message: 'API y MySQL funcionando correctamente.' });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const [[user]] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
  }

  await pool.query('DELETE FROM user_sessions WHERE expires_at <= NOW()');
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, hashSessionToken(token), expiresAt]
  );

  res.json({ token, user: publicUser(user) });
}));

app.use('/api', requireAuth);

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM user_sessions WHERE token_hash = ?', [req.sessionTokenHash]);
  res.status(204).send();
}));

app.get('/api/users', requireAdmin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT id, name, email, role, status, created_at, updated_at
    FROM users
    ORDER BY status DESC, role ASC, name ASC
  `);
  res.json(rows);
}));

app.post('/api/users', requireAdmin, asyncRoute(async (req, res) => {
  const parsed = validateUserInput(req.body);
  if (parsed.error) return res.status(400).json({ message: parsed.error });
  const user = parsed.value;

  const [result] = await pool.query(`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?)
  `, [user.name, user.email, hashPassword(user.password), user.role, user.status]);

  const [[created]] = await pool.query(`
    SELECT id, name, email, role, status, created_at, updated_at
    FROM users WHERE id = ?
  `, [result.insertId]);
  res.status(201).json(created);
}));

app.put('/api/users/:id', requireAdmin, asyncRoute(async (req, res) => {
  const userId = Number(req.params.id);
  const parsed = validateUserInput(req.body, true);
  if (parsed.error) return res.status(400).json({ message: parsed.error });
  const user = parsed.value;

  if (userId === req.user.id && (user.status !== 'active' || user.role !== 'admin')) {
    return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta ni quitarte el rol de administrador.' });
  }

  const fields = ['name = ?', 'email = ?', 'role = ?', 'status = ?'];
  const params = [user.name, user.email, user.role, user.status];
  if (user.password) {
    fields.push('password_hash = ?');
    params.push(hashPassword(user.password));
  }
  params.push(userId);

  const [result] = await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  if (!result.affectedRows) return res.status(404).json({ message: 'Usuario no encontrado.' });

  if (user.status === 'inactive') {
    await pool.query('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
  }

  const [[updated]] = await pool.query(`
    SELECT id, name, email, role, status, created_at, updated_at
    FROM users WHERE id = ?
  `, [userId]);
  res.json(updated);
}));



app.delete('/api/users/:id', requireAdmin, asyncRoute(async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'El identificador del usuario no es válido.' });
  }
  if (userId === req.user.id) {
    return res.status(400).json({ message: 'No puedes eliminar la cuenta con la que tienes la sesión iniciada.' });
  }

  const [[user]] = await pool.query('SELECT id, role FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

  if (user.role === 'admin') {
    const [[adminCount]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND status = 'active'");
    if (Number(adminCount.total) <= 1) {
      return res.status(400).json({ message: 'No se puede eliminar al único administrador activo.' });
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Se eliminan explícitamente las sesiones para que también funcione en bases
    // donde la llave foránea no fue creada con ON DELETE CASCADE.
    await connection.query('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    const [result] = await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    if (!result.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    await connection.commit();
    res.status(204).send();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const [summaryRows] = await pool.query(`
    SELECT
      COALESCE(SUM(CASE
        WHEN status <> 'cancelled'
          AND YEAR(created_at) = YEAR(CURRENT_DATE())
          AND MONTH(created_at) = MONTH(CURRENT_DATE())
        THEN total ELSE 0 END), 0) AS monthlySales,
      SUM(CASE WHEN DATE(created_at) = CURRENT_DATE() AND status <> 'cancelled' THEN 1 ELSE 0 END) AS ordersToday,
      SUM(CASE WHEN status IN ('pending', 'preparing', 'ready') THEN 1 ELSE 0 END) AS activeOrders
    FROM orders
  `);

  const [[customerCount]] = await pool.query('SELECT COUNT(*) AS customers FROM customers');
  const [[productCount]] = await pool.query(`
    SELECT COUNT(*) AS products,
      SUM(CASE WHEN stock <= 5 AND status = 'active' THEN 1 ELSE 0 END) AS lowStock
    FROM products
  `);

  const [salesRows] = await pool.query(`
    SELECT DATE(created_at) AS saleDate, COALESCE(SUM(total), 0) AS total
    FROM orders
    WHERE created_at >= CURRENT_DATE() - INTERVAL 6 DAY
      AND status <> 'cancelled'
    GROUP BY DATE(created_at)
    ORDER BY saleDate ASC
  `);

  const salesByDate = new Map(
    salesRows.map((row) => [new Date(row.saleDate).toISOString().slice(0, 10), Number(row.total)])
  );

  const weeklySales = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    weeklySales.push({ date: key, total: salesByDate.get(key) || 0 });
  }

  const [recentOrders] = await pool.query(`
    SELECT o.id, o.order_number, o.status, o.total, o.payment_method, o.created_at,
      COALESCE(c.name, 'Cliente general') AS customer_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ORDER BY o.created_at DESC
    LIMIT 6
  `);

  const [topProducts] = await pool.query(`
    SELECT p.id, p.name, p.category,
      COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.quantity ELSE 0 END), 0) AS units_sold,
      COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.subtotal ELSE 0 END), 0) AS revenue
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id
    GROUP BY p.id, p.name, p.category
    ORDER BY units_sold DESC, revenue DESC
    LIMIT 5
  `);

  const [lowStockProducts] = await pool.query(`
    SELECT id, name, category, stock
    FROM products
    WHERE stock <= 5 AND status = 'active'
    ORDER BY stock ASC, name ASC
    LIMIT 5
  `);

  res.json({
    summary: {
      monthlySales: Number(summaryRows[0].monthlySales || 0),
      ordersToday: Number(summaryRows[0].ordersToday || 0),
      activeOrders: Number(summaryRows[0].activeOrders || 0),
      customers: Number(customerCount.customers || 0),
      products: Number(productCount.products || 0),
      lowStock: Number(productCount.lowStock || 0)
    },
    weeklySales,
    recentOrders,
    topProducts,
    lowStockProducts
  });
}));

app.get('/api/products', asyncRoute(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();
  const params = [];
  const conditions = [];

  if (search) {
    conditions.push('(name LIKE ? OR category LIKE ? OR description LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM products ${where} ORDER BY created_at DESC`, params);
  res.json(rows);
}));

app.post('/api/products', asyncRoute(async (req, res) => {
  const product = normalizeProduct(req.body);
  const validationError = validateProduct(product);
  if (validationError) return res.status(400).json({ message: validationError });

  const [result] = await pool.query(`
    INSERT INTO products (name, category, description, price, stock, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [product.name, product.category, product.description, product.price, product.stock, product.status]);

  const [[created]] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
  res.status(201).json(created);
}));

app.put('/api/products/:id', asyncRoute(async (req, res) => {
  const product = normalizeProduct(req.body);
  const validationError = validateProduct(product);
  if (validationError) return res.status(400).json({ message: validationError });

  const [result] = await pool.query(`
    UPDATE products
    SET name = ?, category = ?, description = ?, price = ?, stock = ?, status = ?
    WHERE id = ?
  `, [product.name, product.category, product.description, product.price, product.stock, product.status, req.params.id]);

  if (!result.affectedRows) return res.status(404).json({ message: 'Producto no encontrado.' });
  const [[updated]] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  res.json(updated);
}));

app.delete('/api/products/:id', asyncRoute(async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: 'El identificador del producto no es válido.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[product]] = await connection.query(
      'SELECT id, name FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );

    if (!product) {
      await connection.rollback();
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    // Localizar todos los pedidos que incluyen este producto.
    const [relatedOrders] = await connection.query(
      'SELECT DISTINCT order_id FROM order_items WHERE product_id = ?',
      [productId]
    );
    const orderIds = relatedOrders.map((row) => row.order_id);

    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(', ');

      // Se eliminan todos los detalles de los pedidos relacionados, incluso
      // aquellos correspondientes a otros productos incluidos en esos pedidos.
      await connection.query(
        `DELETE FROM order_items WHERE order_id IN (${placeholders})`,
        orderIds
      );

      // Después se eliminan los pedidos completos.
      await connection.query(
        `DELETE FROM orders WHERE id IN (${placeholders})`,
        orderIds
      );
    }

    const [result] = await connection.query(
      'DELETE FROM products WHERE id = ?',
      [productId]
    );

    if (!result.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    await connection.commit();
    return res.json({
      message: `Producto eliminado correctamente. También se eliminaron ${orderIds.length} pedido(s) relacionado(s).`,
      deletedOrders: orderIds.length
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/customers', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT c.*,
      COUNT(o.id) AS orders_count,
      COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  res.json(rows);
}));

app.post('/api/customers', asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim() || null;
  const email = String(req.body.email || '').trim() || null;
  if (!name) return res.status(400).json({ message: 'El nombre del cliente es obligatorio.' });

  const [result] = await pool.query(
    'INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)',
    [name, phone, email]
  );
  const [[created]] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
  res.status(201).json(created);
}));

app.put('/api/customers/:id', asyncRoute(async (req, res) => {
  const customerId = Number(req.params.id);
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim() || null;
  const email = String(req.body.email || '').trim() || null;

  if (!Number.isInteger(customerId) || customerId <= 0) {
    return res.status(400).json({ message: 'El identificador del cliente no es válido.' });
  }
  if (!name) return res.status(400).json({ message: 'El nombre del cliente es obligatorio.' });

  const [result] = await pool.query(
    'UPDATE customers SET name = ?, phone = ?, email = ? WHERE id = ?',
    [name, phone, email, customerId]
  );

  if (!result.affectedRows) return res.status(404).json({ message: 'Cliente no encontrado.' });

  const [[updated]] = await pool.query(`
    SELECT c.*,
      COUNT(o.id) AS orders_count,
      COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
  `, [customerId]);

  res.json(updated);
}));


app.delete('/api/customers/:id', asyncRoute(async (req, res) => {
  const customerId = Number(req.params.id);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return res.status(400).json({ message: 'El identificador del cliente no es válido.' });
  }

  const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [customerId]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Cliente no encontrado.' });
  res.status(204).send();
}));

app.get('/api/orders', asyncRoute(async (_req, res) => {
  const [orders] = await pool.query(`
    SELECT o.*, COALESCE(c.name, 'Cliente general') AS customer_name,
      COALESCE(SUM(oi.quantity), 0) AS items_count
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `);
  res.json(orders);
}));

app.post('/api/orders', asyncRoute(async (req, res) => {
  const customerId = req.body.customer_id ? Number(req.body.customer_id) : null;
  const paymentMethod = allowedPayments.includes(req.body.payment_method) ? req.body.payment_method : 'cash';
  const notes = String(req.body.notes || '').trim() || null;
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!items.length) return res.status(400).json({ message: 'Agrega al menos un producto al pedido.' });

  const groupedItems = new Map();
  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Hay un producto o cantidad no válida.' });
    }
    groupedItems.set(productId, (groupedItems.get(productId) || 0) + quantity);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let total = 0;
    const normalizedItems = [];

    for (const [productId, quantity] of groupedItems.entries()) {
      const [[product]] = await connection.query(
        'SELECT id, name, price, stock, status FROM products WHERE id = ? FOR UPDATE',
        [productId]
      );

      if (!product || product.status !== 'active') {
        throw Object.assign(new Error('Uno de los productos no está disponible.'), { statusCode: 400 });
      }
      if (product.stock < quantity) {
        throw Object.assign(new Error(`No hay suficientes existencias de ${product.name}.`), { statusCode: 400 });
      }

      const subtotal = Number(product.price) * quantity;
      total += subtotal;
      normalizedItems.push({ productId, quantity, unitPrice: Number(product.price), subtotal });
    }

    const orderNumber = `PED-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    const [orderResult] = await connection.query(`
      INSERT INTO orders (customer_id, order_number, status, payment_method, total, notes)
      VALUES (?, ?, 'pending', ?, ?, ?)
    `, [customerId, orderNumber, paymentMethod, total, notes]);

    for (const item of normalizedItems) {
      await connection.query(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `, [orderResult.insertId, item.productId, item.quantity, item.unitPrice, item.subtotal]);

      await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
    }

    await connection.commit();

    const [[created]] = await pool.query(`
      SELECT o.*, COALESCE(c.name, 'Cliente general') AS customer_name
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `, [orderResult.insertId]);

    res.status(201).json(created);
  } catch (error) {
    await connection.rollback();
    error.statusCode = error.statusCode || 500;
    throw error;
  } finally {
    connection.release();
  }
}));

app.delete('/api/orders/:id', asyncRoute(async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'El identificador del pedido no es válido.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[order]] = await connection.query(
      'SELECT id, status FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    // Si el pedido todavía descontaba inventario, se restauran las existencias.
    if (order.status !== 'cancelled') {
      const [items] = await connection.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );
      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
    }

    // Se eliminan primero los detalles para funcionar incluso si la base de
    // producción no tiene configurado ON DELETE CASCADE.
    await connection.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    const [result] = await connection.query('DELETE FROM orders WHERE id = ?', [orderId]);
    if (!result.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    await connection.commit();
    res.status(204).send();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.patch('/api/orders/:id/status', asyncRoute(async (req, res) => {
  const nextStatus = String(req.body.status || '');
  if (!allowedStatuses.includes(nextStatus)) {
    return res.status(400).json({ message: 'Estado de pedido no válido.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[order]] = await connection.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    if (order.status === 'cancelled' && nextStatus !== 'cancelled') {
      await connection.rollback();
      return res.status(400).json({ message: 'Un pedido cancelado no se puede reactivar.' });
    }

    if (order.status !== 'cancelled' && nextStatus === 'cancelled') {
      const [items] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }

    await connection.query('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, order.id]);
    await connection.commit();

    const [[updated]] = await pool.query('SELECT * FROM orders WHERE id = ?', [order.id]);
    res.json(updated);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Ya existe un registro con ese correo o identificador.' });
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ message: 'No se puede eliminar porque el registro está relacionado con otros datos. Elimina primero los registros asociados.' });
  }

  res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : 'Ocurrió un error interno en el servidor.'
  });
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`API disponible en http://localhost:${port}`);
      console.log('MySQL conectado y estructura verificada correctamente.');
    });
  } catch (error) {
    console.error('No fue posible iniciar la API porque MySQL no está disponible o la configuración es incorrecta.');
    console.error(error.message);
    process.exitCode = 1;
  }
}

startServer();
