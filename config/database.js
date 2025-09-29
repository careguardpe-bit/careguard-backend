const { Pool } = require('pg');
require('dotenv').config();

// Para debug: usar variables separadas
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

// Debug: mostrar configuración (sin password completo)
console.log('Configuración DB:', {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD ? `${process.env.PGPASSWORD.substring(0, 4)}...` : 'NO DEFINIDO'
});

// Probar conexión
pool.connect()
  .then(() => console.log('Conectado a Railway PostgreSQL'))
  .catch(err => console.error('Error conectando a Railway PostgreSQL:', err.message));

module.exports = pool;