const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); 

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ⭐ CONFIGURACIÓN DE CORS - CRÍTICO
const corsOptions = {
  origin: [
    'https://unete.careguard.es',
    'https://www.unete.careguard.es',
    'http://localhost:5500',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar rutas
const userRoutes = require('./routes/users');
const documentRoutes = require('./routes/documents');
const submissionRoutes = require('./routes/submissions');
const countryRoutes = require('./routes/country');

// Usar rutas de la API
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/countries', countryRoutes);

// Rutas de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    cors_enabled: true
  });
});

app.get('/test-db', async (req, res) => {
  try {
    const pool = require('./config/database');
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({ 
      success: true, 
      message: 'Base de datos conectada correctamente', 
      current_time: result.rows[0].current_time,
      postgresql_version: result.rows[0].pg_version.split(' ')[0]
    });
  } catch (error) {
    console.error('Error en test-db:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error conectando a BD', 
      error: error.message 
    });
  }
});

// Ruta para obtener estadísticas del sistema
app.get('/api/stats', async (req, res) => {
  try {
    const pool = require('./config/database');
    
    const [users, documents, submissions] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM documents'),
      pool.query('SELECT COUNT(*) FROM submissions')
    ]);

    const submissionsByStatus = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM submissions 
      GROUP BY status
    `);

    res.json({
      success: true,
      data: {
        total_users: parseInt(users.rows[0].count),
        total_documents: parseInt(documents.rows[0].count),
        total_submissions: parseInt(submissions.rows[0].count),
        submissions_by_status: submissionsByStatus.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas'
    });
  }
});

// Ruta principal - info de la API
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Careguard API - Backend',
    version: '1.0.0',
    cors_enabled: true,
    allowed_origins: [
      'https://unete.careguard.es',
      'https://www.unete.careguard.es'
    ],
    endpoints: {
      test: '/api/test',
      database: '/test-db',
      stats: '/api/stats',
      users: '/api/users',
      documents: '/api/documents',
      submissions: '/api/submissions',
      countries: '/api/countries'
    }
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error del servidor:', err);
  
  // Error de Multer (archivos)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Error en la subida del archivo',
      error: err.message
    });
  }

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/test-')) {
    return res.status(404).json({
      success: false,
      message: 'Endpoint no encontrado',
      path: req.path
    });
  }
  
  res.status(404).json({
    success: false,
    message: 'Esta es una API backend. El frontend está en https://unete.careguard.es'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`💾 Base de datos: Railway PostgreSQL`);
  console.log(`🌐 CORS habilitado para: https://unete.careguard.es`);
  console.log(`\n📡 API Endpoints disponibles:`);
  console.log(`   - GET  /api/test`);
  console.log(`   - GET  /test-db`);
  console.log(`   - GET  /api/stats`);
  console.log(`   - POST /api/users`);
  console.log(`   - GET  /api/users/:email`);
  console.log(`   - POST /api/documents`);
  console.log(`   - POST /api/submissions`);
  console.log(`   - GET  /api/countries`);
  console.log(`   - POST /api/countries/select`);
});

// Manejo graceful del cierre del servidor
process.on('SIGTERM', () => {
  console.log('\n⏹️  Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  Cerrando servidor...');
  process.exit(0);
});
