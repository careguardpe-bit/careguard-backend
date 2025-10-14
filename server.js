// Agregar esta línea al inicio del server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); // <-- AGREGAR ESTA LÍNEA
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar storage de multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = './uploads/documents';
    // Crear carpeta si no existe
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.name));
  }
});

const upload = multer({ storage: storage });

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://postulaciones.careguard.es',
    'https://soycareguard.careguard.es'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar rutas
const userRoutes = require('./routes/users');
const documentRoutes = require('./routes/documents');
const submissionRoutes = require('./routes/submissions');

// Usar rutas de la API
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/submissions', submissionRoutes);

// Rutas de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
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

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error del servidor:', err.stack);
  
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
app.get('*', (req, res) => {
  // Si es una ruta de API, devolver JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'Endpoint no encontrado'
    });
  }
  
  // Para otras rutas, intentar servir el index.html (SPA)
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
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Sirviendo frontend desde: ${path.resolve(__dirname, '../frontend')}`);
  
  // Solo Railway PostgreSQL
  console.log(`Base de datos: Railway PostgreSQL`);
  
  console.log(`API endpoints disponibles:`);
  console.log(`   - GET  /api/test`);
  console.log(`   - GET  /test-db`);
  console.log(`   - GET  /api/stats`);
  console.log(`   - POST /api/users`);
  console.log(`   - GET  /api/users`);
  console.log(`   - POST /api/documents`);
  console.log(`   - POST /api/submissions`);
  console.log(`Documentación: http://localhost:${PORT}/api/test`);
});

// Manejo graceful del cierre del servidor
process.on('SIGTERM', () => {
  console.log(' Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(' Cerrando servidor...');
  process.exit(0);
});
