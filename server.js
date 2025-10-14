// Agregar esta línea al inicio del server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); 

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// SOLO servir frontend en desarrollo local, NO en producción (Render)
if (NODE_ENV === 'development') {
  // Servir archivos estáticos (frontend) solo en desarrollo
  app.use(express.static(path.join(__dirname, '../frontend')));
  console.log('🔧 Modo desarrollo: Sirviendo frontend desde backend');
} else {
  console.log('🚀 Modo producción: Backend solo sirve API');
}

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
    environment: NODE_ENV
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

// Ruta raíz - EN PRODUCCIÓN solo devuelve info de la API
app.get('/', (req, res) => {
  if (NODE_ENV === 'production') {
    // En producción, devolver info de la API
    res.json({
      success: true,
      message: 'Careguard API - Backend',
      version: '1.0.0',
      environment: 'production',
      endpoints: {
        test: '/api/test',
        database: '/test-db',
        stats: '/api/stats',
        users: '/api/users',
        documents: '/api/documents',
        submissions: '/api/submissions',
        countries: '/api/countries'
      },
      frontend: 'https://unete.careguard.com.pe',
      documentation: 'https://careguard-backend.onrender.com/api/test'
    });
  } else {
    // En desarrollo, servir el frontend
    res.sendFile(path.join(__dirname, '../frontend/index.html'), (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          message: 'Frontend no encontrado. Asegúrate de que existe la carpeta /frontend'
        });
      }
    });
  }
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
  // Si es una ruta de API, devolver JSON
  if (req.path.startsWith('/api/') || req.path.startsWith('/test-')) {
    return res.status(404).json({
      success: false,
      message: 'Endpoint no encontrado',
      path: req.path
    });
  }
  
  // En producción, redirigir al frontend en Hostinger
  if (NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      message: 'Esta es una API backend. El frontend está en https://unete.careguard.com.pe'
    });
  }
  
  // En desarrollo, intentar servir el index.html
  res.sendFile(path.join(__dirname, '../frontend/index.html'), (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        message: 'Página no encontrada'
      });
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📦 Entorno: ${NODE_ENV}`);
  
  if (NODE_ENV === 'development') {
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
  } else {
    console.log(`🌐 Frontend: https://unete.careguard.com.pe`);
  }
  
  console.log(`💾 Base de datos: Railway PostgreSQL`);
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
