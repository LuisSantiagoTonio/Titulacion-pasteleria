import dotenv from 'dotenv';
import { pool } from '../src/db.js';
import { hashPassword } from '../src/auth.js';

dotenv.config();

const [, , nameArg, emailArg, passwordArg, roleArg = 'employee'] = process.argv;
const name = String(nameArg || '').trim();
const email = String(emailArg || '').trim().toLowerCase();
const password = String(passwordArg || '');
const role = roleArg === 'admin' ? 'admin' : 'employee';

if (!name || !email || password.length < 8) {
  console.error('Uso: npm run create-user -- "Nombre" correo@dominio.com "Contraseña123!" admin');
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exitCode = 1;
} else {
  try {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [name, email, hashPassword(password), role]
    );
    console.log(`Usuario creado con ID ${result.insertId}: ${email} (${role})`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('Ya existe un usuario con ese correo.');
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
